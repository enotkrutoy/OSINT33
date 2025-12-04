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
      <div className="relative group my-4 rounded-lg overflow-hidden border border-slate-700 bg-[#0f172a]">
        <div className="flex justify-between items-center px-4 py-2 bg-slate-800/50 border-b border-slate-700">
          <span className="text-xs font-mono text-slate-400">{match[1].toUpperCase()}</span>
          <button 
            onClick={handleCopy}
            className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase font-mono ${copied ? 'text-green-400' : 'text-slate-400 hover:text-white'}`}
          >
            {copied ? '[COPIED]' : '[COPY]'}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code className={`${className} bg-slate-800/50 px-1.5 py-0.5 rounded text-amber-200 font-mono text-sm border border-white/5`} {...props}>
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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group/msg`}>
      <div 
        className={`
          relative max-w-[95%] md:max-w-[85%] lg:max-w-[75%] px-4 py-3 border-l-2 shadow-lg
          ${isUser 
            ? 'bg-indigo-950/20 border-indigo-500 text-indigo-100 backdrop-blur-sm' 
            : 'bg-slate-900/40 border-orange-500/50 text-slate-300 backdrop-blur-sm'
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
             {/* Copy Button */}
             <button 
               onClick={handleCopyMessage}
               className="bg-slate-800 border border-slate-600 text-slate-400 hover:text-white p-1 rounded shadow-md"
               title="Copy Message"
             >
               {messageCopied ? (
                 <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
               ) : (
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               )}
             </button>

             {/* Edit Button (User only) */}
             {isUser && onEdit && (
               <button 
                 onClick={() => setIsEditing(true)}
                 className="bg-slate-800 border border-slate-600 text-slate-400 hover:text-indigo-400 p-1 rounded shadow-md"
                 title="Edit Message"
               >
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
             )}

             {/* Regenerate Button (Assistant, Last Only) */}
             {isAssistant && isLast && onRegenerate && (
                <button 
                  onClick={() => onRegenerate(message.id)}
                  className="bg-slate-800 border border-slate-600 text-slate-400 hover:text-orange-400 p-1 rounded shadow-md"
                  title="Regenerate Response"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
             )}
          </div>
        )}

        {/* Header line */}
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/5 opacity-70">
          <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${isUser ? 'text-indigo-400' : 'text-orange-400'}`}>
            {isUser ? '>_ USER_INPUT' : ':: VALIDATOR_RESULT'}
          </span>
          <span className="text-[10px] font-mono text-slate-600">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>

        {/* User Attachment Display */}
        {isUser && message.attachment && (
          <div className="mb-3 rounded-md overflow-hidden border border-slate-700 max-w-xs group-hover:border-indigo-500/50 transition-colors">
            <img 
              src={`data:${message.attachment.mimeType};base64,${message.attachment.base64}`} 
              alt="User Upload" 
              className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity"
            />
            <div className="bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>[IMG_DATA]</span>
              <span>{Math.round(message.attachment.base64.length / 1024)} KB</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`markdown-body leading-relaxed break-words font-light ${isUser ? 'text-indigo-50' : 'text-slate-300'}`}>
           {isEditing ? (
             <div className="flex flex-col gap-2">
               <textarea
                 ref={textareaRef}
                 value={editContent}
                 onChange={(e) => setEditContent(e.target.value)}
                 className="w-full bg-slate-950/50 text-indigo-100 p-2 rounded border border-indigo-500/50 focus:outline-none focus:border-indigo-500 resize-none font-mono text-sm"
                 rows={Math.max(2, editContent.split('\n').length)}
               />
               <div className="flex justify-end gap-2">
                 <button 
                   onClick={handleCancelEdit}
                   className="px-3 py-1 text-xs font-mono text-slate-400 hover:text-white bg-slate-800 rounded"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={handleSaveEdit}
                   className="px-3 py-1 text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded"
                 >
                   SAVE & RE-RUN
                 </button>
               </div>
             </div>
           ) : (
             <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               components={{ code: CodeBlock }}
             >
                {message.content}
             </ReactMarkdown>
           )}
        </div>

        {/* Sources (Only for assistant) */}
        {!isUser && message.groundingChunks && message.groundingChunks.length > 0 && (
          <div className="mt-4 pt-2 border-t border-slate-800/50">
             <SourceChips sources={message.groundingChunks} />
          </div>
        )}
      </div>
    </div>
  );
});

export { TerminalLoader };