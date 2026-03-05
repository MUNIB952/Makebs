import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db, storage, auth, signInAnonymously, isConfigured } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export type AgentType = 'requirement';

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface File {
  id: string;
  name: string;
  type: 'text' | 'image' | 'pdf';
  content: string; // URL or text content
}

export interface Question {
  id: string;
  text: string;
  status: 'pending' | 'active' | 'resolved';
}

export interface Project {
  id: string;
  name: string;
  files: File[];
  chatHistory: Record<AgentType, Message[]>;
  prdData: Record<string, any>;
  questions: Question[];
}

export interface UploadingFile {
  id: string;
  name: string;
  type: 'text' | 'image' | 'pdf';
}

interface WorkspaceState {
  projects: Project[];
  activeProjectId: string | null;
  activeAgent: AgentType;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  activeArtifact: File | null;
  fileToTag: File | null;
  userId: string | null;
  isInitializing: boolean;
  uploadingFiles: UploadingFile[];
  
  // Actions
  initSync: () => void;
  createProject: (name: string) => void;
  setActiveProject: (id: string) => void;
  setActiveAgent: (agent: AgentType) => void;
  addMessage: (projectId: string, agent: AgentType, message: Message) => void;
  clearChatHistory: (projectId: string, agent: AgentType) => void;
  addFile: (projectId: string, file: Omit<File, 'id'>) => Promise<void>;
  updateFile: (projectId: string, fileId: string, content: string) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setActiveArtifact: (file: File | null) => void;
  setFileToTag: (file: File | null) => void;
  updatePrdData: (projectId: string, updates: Record<string, any>) => void;
  manageQuestion: (projectId: string, action: 'add' | 'update_status' | 'delete', payload: any) => void;
}

const syncProject = (projectId: string, state: WorkspaceState) => {
  if (!isConfigured || !db || !state.userId) return;
  const project = state.projects.find(p => p.id === projectId);
  if (project) {
    setDoc(doc(db, `users/${state.userId}/projects`, projectId), project).catch(console.error);
  }
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeAgent: 'requirement',
  isLeftSidebarOpen: true,
  isRightSidebarOpen: true, // Open by default for consultation room feel
  activeArtifact: null,
  fileToTag: null,
  userId: null,
  isInitializing: true,
  uploadingFiles: [],

  initSync: async () => {
    if (!isConfigured || !auth || !db) {
      set({ isInitializing: false });
      return;
    }
    try {
      const userCred = await signInAnonymously(auth);
      const uid = userCred.user.uid;
      set({ userId: uid });

      const projectsRef = collection(db, `users/${uid}/projects`);
      onSnapshot(projectsRef, (snapshot) => {
        const projects: Project[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Project;
          // Migration for old projects
          if (!data.prdData) data.prdData = {};
          if (!data.questions) data.questions = [];
          if (!data.chatHistory.requirement) data.chatHistory.requirement = [];
          projects.push(data);
        });
        
        set({ projects, isInitializing: false });
        
        if (projects.length > 0) {
          const state = get();
          if (!projects.find(p => p.id === state.activeProjectId)) {
            set({ activeProjectId: projects[0].id });
          }
        }
      }, (error) => {
        console.warn("Firestore listener error (likely permission denied due to missing rules):", error.message);
        set({ isInitializing: false });
        // We don't throw here, we just let the local state continue working
      });
    } catch (error) {
      console.error("Firebase sync failed:", error);
      set({ isInitializing: false });
    }
  },

  createProject: (name) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      files: [],
      chatHistory: {
        requirement: [],
      },
      prdData: {},
      questions: [],
    };
    set((state) => {
      const newState = {
        projects: [...state.projects, newProject],
        activeProjectId: newProject.id,
      };
      setTimeout(() => syncProject(newProject.id, { ...state, ...newState }), 0);
      return newState;
    });
  },

  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  addMessage: (projectId, agent, message) =>
    set((state) => {
      const newProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            chatHistory: {
              ...p.chatHistory,
              [agent]: [...p.chatHistory[agent], message],
            },
          };
        }
        return p;
      });
      const newState = { projects: newProjects };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    }),

  clearChatHistory: (projectId, agent) =>
    set((state) => {
      const newProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            chatHistory: {
              ...p.chatHistory,
              [agent]: [],
            },
          };
        }
        return p;
      });
      const newState = { projects: newProjects };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    }),

  addFile: async (projectId, file) => {
    const fileId = uuidv4();
    let content = file.content;

    set((state) => ({
      uploadingFiles: [...state.uploadingFiles, { id: fileId, name: file.name, type: file.type }],
    }));

    if (isConfigured && storage && get().userId && file.type === 'image' && content.startsWith('data:')) {
      try {
        const uid = get().userId;
        const storageRef = ref(storage, `users/${uid}/projects/${projectId}/${fileId}`);
        await uploadString(storageRef, content, 'data_url');
        content = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Failed to upload image to Firebase Storage", error);
      }
    }

    set((state) => {
      const newProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            files: [...p.files, { ...file, id: fileId, content }],
          };
        }
        return p;
      });
      const newState = { 
        projects: newProjects,
        uploadingFiles: state.uploadingFiles.filter(f => f.id !== fileId)
      };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    });
  },

  updateFile: (projectId, fileId, content) =>
    set((state) => {
      const updatedProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            files: p.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
          };
        }
        return p;
      });
      
      const isUpdatingActive = state.activeArtifact?.id === fileId;
      
      const newState = {
        projects: updatedProjects,
        activeArtifact: isUpdatingActive ? { ...state.activeArtifact!, content } : state.activeArtifact,
      };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    }),

  deleteFile: (projectId, fileId) =>
    set((state) => {
      const isDeletingActive = state.activeArtifact?.id === fileId;
      const newState = {
        projects: state.projects.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              files: p.files.filter((f) => f.id !== fileId),
            };
          }
          return p;
        }),
        activeArtifact: isDeletingActive ? null : state.activeArtifact,
        isRightSidebarOpen: isDeletingActive ? false : state.isRightSidebarOpen,
      };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    }),

  toggleLeftSidebar: () => set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
  setActiveArtifact: (file) => set({ activeArtifact: file, isRightSidebarOpen: !!file }),
  setFileToTag: (file) => set({ fileToTag: file }),

  updatePrdData: (projectId, updates) =>
    set((state) => {
      const newProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            prdData: { ...p.prdData, ...updates },
          };
        }
        return p;
      });
      const newState = { projects: newProjects };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    }),

  manageQuestion: (projectId, action, payload) =>
    set((state) => {
      const newProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          let newQuestions = [...p.questions];
          if (action === 'add') {
            newQuestions.push({
              id: uuidv4(),
              text: payload.text,
              status: 'pending',
            });
          } else if (action === 'update_status') {
            newQuestions = newQuestions.map((q) =>
              q.id === payload.id ? { ...q, status: payload.status } : q
            );
          } else if (action === 'delete') {
            newQuestions = newQuestions.filter((q) => q.id !== payload.id);
          }
          return {
            ...p,
            questions: newQuestions,
          };
        }
        return p;
      });
      const newState = { projects: newProjects };
      setTimeout(() => syncProject(projectId, { ...state, ...newState }), 0);
      return newState;
    }),
}));
