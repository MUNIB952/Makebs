'use client';

import { useWorkspaceStore, Message } from '@/store/useWorkspaceStore';
import { AGENTS } from '@/lib/agents';
import { generateAgentResponse } from '@/lib/gemini';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Bot, PanelRightOpen, PanelLeftOpen, Trash2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';

export default function ChatArea() {
  const { 
    projects, 
    activeProjectId, 
    activeAgent, 
    addMessage, 
    clearChatHistory,
    isLeftSidebarOpen, 
    isRightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    fileToTag,
    setFileToTag,
    setActiveArtifact,
    isInitializing
  } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const agent = AGENTS[activeAgent];
  
  const messages = useMemo(() => {
    return activeProject?.chatHistory[activeAgent] || [];
  }, [activeProject, activeAgent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (fileToTag && inputRef.current) {
      inputRef.current.focus();
      const displayName = fileToTag.name.length > 10 ? fileToTag.name.substring(0, 10) + '...' : fileToTag.name;
      const html = `&nbsp;<span contenteditable="false" class="inline-flex items-center bg-zinc-200 text-zinc-900 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer align-middle" data-file-id="${fileToTag.id}" data-file-name="${fileToTag.name}" title="${fileToTag.name}">@${displayName}</span>&nbsp;`;
      document.execCommand('insertHTML', false, html);
      setFileToTag(null);
    }
  }, [fileToTag, setFileToTag]);

  const handleSend = async () => {
    if (!inputRef.current || isLoading || !activeProject) return;

    let text = '';
    for (const node of Array.from(inputRef.current.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-file-id')) {
          text += `@[${el.getAttribute('data-file-name')}](${el.getAttribute('data-file-id')})`;
        } else {
          text += el.innerText || el.textContent;
        }
      }
    }

    const finalInput = text.trim();
    if (!finalInput) return;

    inputRef.current.innerHTML = '';

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: finalInput,
      timestamp: Date.now(),
    };

    addMessage(activeProject.id, activeAgent, userMsg);
    setIsLoading(true);

    try {
      const responseText = await generateAgentResponse(
        activeAgent,
        messages, 
        activeProject,
        userMsg.content,
        {
          onUpdatePrd: (updates) => {
            useWorkspaceStore.getState().updatePrdData(activeProject.id, updates);
          },
          onManageQuestion: (action, payload) => {
            useWorkspaceStore.getState().manageQuestion(activeProject.id, action, payload);
          }
        }
      );

      const aiMsg: Message = {
        id: uuidv4(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
      };

      addMessage(activeProject.id, activeAgent, aiMsg);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: uuidv4(),
        role: 'model',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: Date.now(),
      };
      addMessage(activeProject.id, activeAgent, errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    // Strip tags for clipboard
    const cleanContent = content.replace(/@\[(.*?)\]\((.*?)\)/g, '@$1');
    navigator.clipboard.writeText(cleanContent);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMessageContent = (content: string) => {
    // Pre-process custom tag syntax to markdown links
    const processedContent = content.replace(/@\[(.*?)\]\((.*?)\)/g, '[$1](https://internal-file/$2)');

    return (
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('https://internal-file/')) {
              const fileId = href.replace('https://internal-file/', '');
              const file = activeProject?.files.find(f => f.id === fileId);
              const fullName = Array.isArray(children) ? children.join('') : String(children);
              const displayName = fullName.length > 10 ? fullName.substring(0, 10) + '...' : fullName;
              return (
                <span 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (file) setActiveArtifact(file);
                  }} 
                  className="inline-flex items-center bg-zinc-200 text-zinc-900 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:bg-zinc-300 transition-colors mx-1 align-middle"
                  title={fullName}
                >
                  @{displayName}
                </span>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 transition-opacity">{children}</a>;
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white text-zinc-900 relative">
      {/* Header */}
      <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-4 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {!isLeftSidebarOpen && (
            <button onClick={toggleLeftSidebar} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors">
              <PanelLeftOpen size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div>
              <h2 className="font-semibold text-sm text-zinc-900">{agent.name}</h2>
              <p className="text-xs text-zinc-500 truncate max-w-xs">{agent.description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => activeProject && clearChatHistory(activeProject.id, activeAgent)}
              className="p-1.5 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-colors"
              title="Clear Chat"
            >
              <Trash2 size={16} />
            </button>
          )}
          {!isRightSidebarOpen && (
            <button onClick={toggleRightSidebar} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors">
              <PanelRightOpen size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-32 space-y-6">
        {isInitializing ? (
          <div className="space-y-6 animate-pulse">
            <div className="flex gap-4">
              <div className="max-w-[80%] bg-zinc-100 px-4 py-4 rounded-2xl rounded-tl-sm w-64 h-20"></div>
            </div>
            <div className="flex gap-4 flex-row-reverse">
              <div className="max-w-[80%] bg-zinc-200 px-4 py-4 rounded-2xl rounded-tr-sm w-48 h-12"></div>
            </div>
            <div className="flex gap-4">
              <div className="max-w-[80%] bg-zinc-100 px-4 py-4 rounded-2xl rounded-tl-sm w-72 h-32"></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
            <Bot size={48} className="opacity-20" />
            <p className="text-sm">Start a conversation with the {agent.name}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-[80%] relative ${msg.role === 'user' ? 'bg-zinc-900 text-white px-4 py-2 rounded-2xl rounded-tr-sm' : 'bg-zinc-100 text-zinc-900 px-4 py-2 rounded-2xl rounded-tl-sm'}`}>
                {msg.role === 'model' ? (
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white prose-pre:border prose-pre:border-zinc-200">
                    {renderMessageContent(msg.content)}
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {renderMessageContent(msg.content)}
                  </div>
                )}
                
                {msg.role === 'model' && (
                  <button 
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="absolute -right-8 bottom-0 p-1.5 text-zinc-400 hover:text-zinc-900 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-100"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-4">
            <div className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-zinc-500" />
              <span className="text-xs text-zinc-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pb-6 pt-10 px-4 z-10">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-2xl p-2 focus-within:bg-white focus-within:ring-1 focus-within:ring-zinc-200 focus-within:shadow-md transition-all shadow-sm">
          <div
            ref={inputRef}
            contentEditable
            data-placeholder={`Message ${agent.name}...`}
            className="flex-1 max-h-48 min-h-[40px] bg-transparent border-none focus:outline-none text-sm p-2 text-zinc-900 overflow-y-auto no-scrollbar empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 whitespace-pre-wrap"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const pill = target.closest('[data-file-id]');
              if (pill) {
                const fileId = pill.getAttribute('data-file-id');
                const file = activeProject?.files.find(f => f.id === fileId);
                if (file) setActiveArtifact(file);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white rounded-xl transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-center mt-1">
          <span className="text-[10px] text-zinc-500">AI can make mistakes. Consider verifying important information.</span>
        </div>
      </div>
    </div>
  );
}
