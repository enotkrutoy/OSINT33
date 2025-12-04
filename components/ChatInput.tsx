import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (message: string, attachment?: Attachment) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 5;

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachment) && !disabled) {
      onSend(input.trim(), attachment || undefined);
      setInput('');
      setAttachment(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File too large. Max: ${MAX_FILE_SIZE_MB}MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({
        base64: (reader.result as string).split(',')[1],
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => adjustHeight(), [input]);

  return (
    <div className="absolute bottom-4 left-0 right-0 px-4 z-40 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        {/* Attachment Preview Bubble */}
        {attachment && (
          <div className="mb-2 inline-flex items-center gap-3 bg-[#1e293b] border border-slate-700 rounded-lg p-2 shadow-lg animate-fade-in">
            <div className="w-10 h-10 bg-indigo-900/30 rounded flex items-center justify-center text-indigo-400">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">Media Attached</p>
              <p className="text-[10px] text-slate-500 font-mono">Ready for Vision API</p>
            </div>
            <button onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value=''; }} className="ml-2 text-slate-500 hover:text-red-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className={`
          relative flex items-end gap-2 bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl transition-all
          ${disabled ? 'opacity-50' : 'hover:border-indigo-500/30 focus-within:border-indigo-500/50'}
        `}>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" className="hidden" />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={disabled}
            className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Введите цель для OSINT анализа..."
            className="w-full bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-sm py-3 px-1 min-h-[44px] max-h-[150px] resize-none font-medium"
            rows={1}
          />

          <button 
            onClick={() => handleSubmit()} 
            disabled={(!input.trim() && !attachment) || disabled}
            className={`
              p-2.5 rounded-lg transition-all duration-200 flex-shrink-0 mb-0.5
              ${(input.trim() || attachment) && !disabled ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-800 text-slate-600'}
            `}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
        
        <div className="flex justify-between mt-2 px-2">
           <span className="text-[10px] text-slate-600 font-mono">SECURE CONNECTION // ENCRYPTED</span>
           <span className="text-[10px] text-slate-600 font-mono">GEMINI-2.5-FLASH</span>
        </div>
      </div>
    </div>
  );
};