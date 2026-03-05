'use client';

import { useWorkspaceStore, AgentType } from '@/store/useWorkspaceStore';
import { AGENTS } from '@/lib/agents';
import { FileText, Image as ImageIcon, File as FileIcon, Plus, PenTool, Smile, Megaphone, Folder, ChevronDown, ChevronRight, PanelLeftClose, Home, Trash2, AtSign } from 'lucide-react';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as Separator from '@radix-ui/react-separator';

const iconMap = {
  PenTool: PenTool,
  Smile: Smile,
  Megaphone: Megaphone,
};

export default function Sidebar() {
  const { 
    projects, 
    activeProjectId, 
    activeAgent, 
    setActiveProject, 
    setActiveAgent, 
    createProject,
    setActiveArtifact,
    toggleLeftSidebar,
    addFile,
    deleteFile,
    setFileToTag,
    isInitializing,
    uploadingFiles
  } = useWorkspaceStore();

  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsProjectsOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const type = file.type.startsWith('image/') ? 'image' : 'text';
      addFile(activeProjectId, { name: file.name, type, content });
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 text-zinc-900 border-r border-zinc-200 w-full">
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="p-1 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Go to Home">
            <Home size={18} />
          </button>
          <h2 className="font-semibold text-zinc-900 truncate">Workspace</h2>
        </div>
        <button onClick={toggleLeftSidebar} className="p-1 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors md:hidden">
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Agents List */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Agents</h3>
        <div className="space-y-1">
          {(Object.keys(AGENTS) as AgentType[]).map((agentKey) => {
            const agent = AGENTS[agentKey];
            const Icon = iconMap[agent.icon as keyof typeof iconMap] || Smile;
            return (
              <button
                key={agentKey}
                onClick={() => setActiveAgent(agentKey)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${activeAgent === agentKey ? 'bg-zinc-900 text-white font-medium' : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
              >
                <Icon size={16} className={activeAgent === agentKey ? 'text-zinc-300' : 'text-zinc-500'} />
                {agent.name}
              </button>
            );
          })}
        </div>
      </div>

      <Separator.Root className="h-[1px] bg-zinc-200 w-full" />

      {/* File Watcher */}
      <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project Files</h3>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors"
            title="Upload File"
            disabled={isInitializing}
          >
            <Plus size={14} className={isInitializing ? "opacity-50" : ""} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,.txt,.md,.json,.csv"
          />
        </div>
        
        {isInitializing ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md animate-pulse">
                <div className="w-3.5 h-3.5 bg-zinc-200 rounded shrink-0"></div>
                <div className="h-3.5 bg-zinc-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : activeProject?.files.length === 0 && uploadingFiles.length === 0 ? (
          <div className="text-xs text-zinc-500 italic px-2">No files in project</div>
        ) : (
          <div className="space-y-1">
            {activeProject?.files.map(file => {
              let FileIconComponent = FileIcon;
              if (file.type === 'text') FileIconComponent = FileText;
              if (file.type === 'image') FileIconComponent = ImageIcon;
              
              return (
                <div 
                  key={file.id} 
                  onClick={() => setActiveArtifact(file)}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIconComponent size={14} className="text-zinc-400 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFileToTag(file); }}
                      className="p-1 hover:bg-zinc-300 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
                      title="Tag in chat"
                    >
                      <AtSign size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteFile(activeProject.id, file.id); }}
                      className="p-1 hover:bg-red-100 rounded text-zinc-500 hover:text-red-600 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Uploading files shimmer */}
            {uploadingFiles.map(file => {
              let FileIconComponent = FileIcon;
              if (file.type === 'text') FileIconComponent = FileText;
              if (file.type === 'image') FileIconComponent = ImageIcon;
              
              return (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm opacity-50 animate-pulse bg-zinc-100"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIconComponent size={14} className="text-zinc-400 shrink-0" />
                    <span className="truncate text-zinc-500">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Uploading...</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
