'use client';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, ArrowRight } from 'lucide-react';

export default function Home() {
  const { projects, createProject, isInitializing } = useWorkspaceStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Agentic Workspace</h1>
          <p className="text-zinc-500">Select a project or create a new one to get started.</p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Your Projects</h2>
          
          {isInitializing ? (
            <div className="space-y-3 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-200"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-zinc-200 rounded"></div>
                      <div className="h-3 w-16 bg-zinc-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm mb-6">No projects yet. Create one below!</div>
          ) : (
            <div className="space-y-3 mb-6">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="w-full flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-200 transition-colors">
                      <Folder size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900">{project.name}</h3>
                      <p className="text-xs text-zinc-500">{project.files.length} files</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                </button>
              ))}
            </div>
          )}

          <div className="pt-6 border-t border-zinc-200">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="flex gap-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={!newProjectName.trim()}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Create
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
