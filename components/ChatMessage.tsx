import React, { memo, useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, MessageRole } from '../types';
import { SourceChips } from './SourceChips';
import { TerminalLoader } from './TerminalLoader';

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
}

// Custom Code Block Component with Copy Button
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group my-4 rounded-lg overflow-hidden border border-slate-700 bg-[#0f172a] shadow-sm">
        <div className="flex justify-between items-center px-4 py-2 bg-slate-800/50 border-b border-slate-700">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{match[1]}</span>
          <button 
            onClick={handleCopy}
            className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase font-mono border border-transparent ${copied ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code className={`${className} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-sm border border-white/5`} {...props}>
      {children}
    </code>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = memo(({ message, isLast, onRegenerate, onEdit }) => {
  const isUser = message.role === MessageRole.USER;
  const isAssistant = message.role === MessageRole.ASSISTANT;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [messageCopied, setMessageCopied] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit?.(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group/msg animate-fade-in`}>
      <div 
        className={`
          relative max-w-[95%] md:max-w-[85%] lg:max-w-[75%] px-4 py-3 border-l-2 shadow-lg rounded-r-lg rounded-bl-lg
          ${isUser 
            ? 'bg-indigo-950/20 border-indigo-500 text-indigo-100 backdrop-blur-sm' 
            : 'bg-slate-900/60 border-orange-500/50 text-slate-300 backdrop-blur-sm'
          }
        `}
      >
        {/* Actions Toolbar (Visible on Hover) */}
        {!isEditing && (
          <div className={`
            absolute -top-3 ${isUser ? 'left-0' : 'right-0'} 
            opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200
            flex gap-1
          `}>
             <button 
               onClick={handleCopyMessage}
               className="bg-slate-800 border border-slate-600 text-slate-400 hover:text-white p-1.5 rounded shadow-md transition-colors"
               title="Copy Message"
             >
               {messageCopied ? (
                 <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
               ) : (
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               )}
             </button>

             {isUser && onEdit && (
               <button 
                 onClick={() => setIsEditing(true)}
                 className="bg-slate-800 border border-slate-600 text-slate-400 hover:text-indigo-400 p-1.5 rounded shadow-md transition-colors"
                 title="Edit Message"
               >
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
             )}

             {isAssistant && isLast && onRegenerate && (
                <button 
                  onClick={() => onRegenerate(message.id)}
                  className="bg-slate-800 border border-slate-600 text-slate-400 hover:text-orange-400 p-1.5 rounded shadow-md transition-colors"
                  title="Regenerate Response"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
             )}
          </div>
        )}

        {/* Header line */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5 opacity-70">
          <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${isUser ? 'text-indigo-400' : 'text-orange-400'}`}>
            {isUser ? '>_ USER_INPUT' : ':: VALIDATOR_RESULT'}
          </span>
          <span className="text-[10px] font-mono text-slate-600">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>

        {/* User Attachment Display */}
        {isUser && message.attachment && (
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-700 max-w-sm group-hover:border-indigo-500/50 transition-colors bg-[#020617]">
            <img 
              src={`data:${message.attachment.mimeType};base64,${message.attachment.base64}`} 
              alt="User Upload" 
              className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity"
            />
            <div className="bg-slate-900/80 px-3 py-2 text-[10px] font-mono text-slate-500 flex justify-between border-t border-slate-800">
              <span className="text-indigo-400">[IMG_DATA]</span>
              <span>{Math.round(message.attachment.base64.length / 1024)} KB</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`markdown-body leading-relaxed break-words font-light ${isUser ? 'text-indigo-50' : 'text-slate-300'}`}>
           {isEditing ? (
             <div className="flex flex-col gap-3 animate-fade-in">
               <textarea
                 ref={textareaRef}
                 value={editContent}
                 onChange={(e) => setEditContent(e.target.value)}
                 className="w-full bg-slate-950/50 text-indigo-100 p-3 rounded border border-indigo-500/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none font-mono text-sm"
                 rows={Math.max(3, editContent.split('\n').length)}
               />
               <div className="flex justify-end gap-2">
                 <button 
                   onClick={handleCancelEdit}
                   className="px-4 py-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-all"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={handleSaveEdit}
                   className="px-4 py-1.5 text-xs font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded shadow-lg shadow-indigo-900/20 transition-all"
                 >
                   SAVE & RE-RUN
                 </button>
               </div>
             </div>
           ) : (
             <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               components={{ 
                  code: CodeBlock,
                  // CUSTOM DORK BUTTON RENDERER
                  a: ({ href, children }) => {
                    const isGoogleSearch = href?.includes('google.com/search');
                    if (isGoogleSearch) {
                      return (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 my-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-red-100 text-xs font-mono font-bold rounded uppercase transition-all shadow-[0_0_15px_rgba(220,38,38,0.1)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] no-underline group select-none w-fit decoration-0"
                        >
                          <span className="relative flex h-2 w-2 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          <span className="tracking-wide">{children}</span>
                          <svg className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      );
                    }
                    // Standard Link Style
                    return (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 border-b border-cyan-500/30 hover:border-cyan-400 transition-colors pb-0.5 inline-flex items-center gap-1"
                      >
                        {children}
                        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    );
                  }
               }}
             >
                {message.content}
             </ReactMarkdown>
           )}
        </div>

        {/* Sources (Only for assistant) */}
        {!isUser && message.groundingChunks && message.groundingChunks.length > 0 && (
          <div className="mt-6 pt-3 border-t border-slate-800/50">
             <SourceChips sources={message.groundingChunks} />
          </div>
        )}
      </div>
    </div>
  );
});

export { TerminalLoader };