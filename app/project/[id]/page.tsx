'use client';

import Sidebar from '@/components/workspace/Sidebar';
import ChatArea from '@/components/workspace/ChatArea';
import RequirementsPanel from '@/components/workspace/RequirementsPanel';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

export default function Workspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLeftSidebarOpen, isRightSidebarOpen, setActiveProject, projects } = useWorkspaceStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const projectExists = projects.some(p => p.id === id);
    if (!projectExists) {
      router.push('/');
      return;
    }
    setActiveProject(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [id, projects, setActiveProject, router]);

  if (!mounted) return null;

  return (
    <div className="h-screen w-full bg-white text-zinc-900 overflow-hidden font-sans flex relative">
      {/* Mobile Sidebar Overlay */}
      {isLeftSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => useWorkspaceStore.getState().toggleLeftSidebar()}
        />
      )}
      
      {/* Left Sidebar */}
      <div 
        className={`absolute md:relative z-30 h-full w-64 shrink-0 bg-zinc-50 border-r border-zinc-200 transition-transform duration-300 ease-in-out ${
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden md:w-0 md:border-none'
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 h-full min-w-0 flex flex-col">
        <ChatArea />
      </div>

      {/* Right Sidebar (Requirements Panel) */}
      <div 
        className={`absolute right-0 md:relative z-30 h-full w-full md:w-96 shrink-0 bg-zinc-50 border-l border-zinc-200 transition-transform duration-300 ease-in-out ${
          isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full md:hidden md:w-0 md:border-none'
        }`}
      >
        <RequirementsPanel />
      </div>
    </div>
  );
}
