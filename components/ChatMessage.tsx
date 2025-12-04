import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, MessageRole } from '../types';
import { SourceChips } from './SourceChips';
import { TerminalLoader } from './TerminalLoader';

interface ChatMessageProps {
  message: Message;
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

export const ChatMessage: React.FC<ChatMessageProps> = memo(({ message }) => {
  const isUser = message.role === MessageRole.USER;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div 
        className={`
          relative max-w-[95%] md:max-w-[85%] lg:max-w-[75%] px-4 py-3 border-l-2 shadow-lg
          ${isUser 
            ? 'bg-indigo-950/20 border-indigo-500 text-indigo-100 backdrop-blur-sm' 
            : 'bg-slate-900/40 border-orange-500/50 text-slate-300 backdrop-blur-sm'
          }
        `}
      >
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
           <ReactMarkdown 
             remarkPlugins={[remarkGfm]}
             components={{ code: CodeBlock }}
           >
              {message.content}
           </ReactMarkdown>
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

export { TerminalLoader }; // Re-export for convenience