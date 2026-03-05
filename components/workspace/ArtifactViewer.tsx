'use client';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { X, FileText, Image as ImageIcon, File as FileIcon, Download, PanelRightClose, Edit2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ArtifactViewer() {
  const { activeArtifact, setActiveArtifact, toggleRightSidebar, updateFile, activeProjectId } = useWorkspaceStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (activeArtifact?.type === 'text') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditContent(activeArtifact.content);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
    }
  }, [activeArtifact]);

  if (!activeArtifact) {
    return (
      <div className="h-full flex flex-col bg-zinc-50 border-l border-zinc-200 w-full">
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-zinc-900">Artifacts</h2>
          <button onClick={toggleRightSidebar} className="p-1 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors">
            <PanelRightClose size={18} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm p-4 text-center">
          Select a file from the project to view it here.
        </div>
      </div>
    );
  }

  let FileIconComponent = FileIcon;
  if (activeArtifact.type === 'text') FileIconComponent = FileText;
  if (activeArtifact.type === 'image') FileIconComponent = ImageIcon;

  const handleSave = () => {
    if (activeProjectId && activeArtifact) {
      updateFile(activeProjectId, activeArtifact.id, editContent);
      setIsEditing(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([activeArtifact.content], { type: activeArtifact.type === 'image' ? 'image/png' : 'text/plain' });
    element.href = activeArtifact.type === 'image' ? activeArtifact.content : URL.createObjectURL(file);
    element.download = activeArtifact.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx': return 'javascript';
      case 'ts':
      case 'tsx': return 'typescript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'sh': return 'bash';
      default: return 'text';
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 border-l border-zinc-200 w-full">
      <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileIconComponent size={16} className="text-zinc-500 shrink-0" />
          <h2 className="font-semibold text-zinc-900 text-sm truncate">{activeArtifact.name}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {activeArtifact.type === 'text' && (
            isEditing ? (
              <button onClick={handleSave} className="p-1.5 hover:bg-zinc-200 rounded-md text-green-600 hover:text-green-700 transition-colors" title="Save changes">
                <Check size={16} />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Edit file">
                <Edit2 size={16} />
              </button>
            )
          )}
          <button onClick={handleDownload} className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Download">
            <Download size={16} />
          </button>
          <button onClick={() => setActiveArtifact(null)} className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Close">
            <X size={16} />
          </button>
          <button onClick={toggleRightSidebar} className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors ml-1 border-l border-zinc-200 pl-2" title="Hide sidebar">
            <PanelRightClose size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto no-scrollbar bg-white">
        {activeArtifact.type === 'text' && (
          isEditing ? (
            <div className="p-4 h-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-[300px] text-sm text-zinc-800 font-mono resize-none focus:outline-none bg-transparent"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="h-full text-sm">
              <SyntaxHighlighter
                language={getLanguage(activeArtifact.name)}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  minHeight: '100%',
                  background: '#1e1e1e', // VS Code dark background
                  fontSize: '13px',
                  borderRadius: 0,
                }}
                showLineNumbers={true}
                wrapLines={true}
                wrapLongLines={true}
              >
                {activeArtifact.content}
              </SyntaxHighlighter>
            </div>
          )
        )}
        {activeArtifact.type === 'image' && (
          <div className="flex items-center justify-center h-full p-4 bg-zinc-100/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeArtifact.content} 
              alt={activeArtifact.name} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-zinc-200 bg-white"
              style={{ maxHeight: '85vh' }}
            />
          </div>
        )}
        {activeArtifact.type === 'pdf' && (
          <div className="flex items-center justify-center h-full text-zinc-500 flex-col gap-2 p-4">
            <FileIcon size={48} className="opacity-20" />
            <p className="text-sm">PDF viewer not implemented in this demo.</p>
            <p className="text-xs">File: {activeArtifact.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
