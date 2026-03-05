'use client';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { PanelRightClose, CheckCircle2, Circle, HelpCircle } from 'lucide-react';

export default function RequirementsPanel() {
  const { projects, activeProjectId, toggleRightSidebar } = useWorkspaceStore();
  
  const activeProject = projects.find(p => p.id === activeProjectId);

  if (!activeProject) return null;

  const { prdData, questions } = activeProject;

  return (
    <div className="h-full flex flex-col bg-zinc-50 border-l border-zinc-200 w-full overflow-hidden">
      <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white">
        <h2 className="font-semibold text-zinc-900 text-sm">Consultation Room</h2>
        <button onClick={toggleRightSidebar} className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Hide sidebar">
          <PanelRightClose size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        
        {/* PRD Section */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Product Requirements (PRD)</h3>
          {Object.keys(prdData).length === 0 ? (
            <div className="text-sm text-zinc-400 italic bg-white p-4 rounded-xl border border-zinc-200 border-dashed">
              PRD is currently empty. The agent will populate this as you answer questions.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(prdData).map(([key, value]) => (
                <div key={key} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <h4 className="text-sm font-medium text-zinc-900 capitalize mb-2">{key.replace(/_/g, ' ')}</h4>
                  <p className="text-sm text-zinc-600 whitespace-pre-wrap">{String(value)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Questions Section */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Question Stack</h3>
          {questions.length === 0 ? (
            <div className="text-sm text-zinc-400 italic bg-white p-4 rounded-xl border border-zinc-200 border-dashed">
              No pending questions.
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div 
                  key={q.id} 
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    q.status === 'resolved' 
                      ? 'bg-zinc-50 border-zinc-200 opacity-60' 
                      : q.status === 'active'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-zinc-200 shadow-sm'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {q.status === 'resolved' ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : q.status === 'active' ? (
                      <HelpCircle size={16} className="text-blue-500" />
                    ) : (
                      <Circle size={16} className="text-zinc-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${q.status === 'resolved' ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>
                      {q.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
