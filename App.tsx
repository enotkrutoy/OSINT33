import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { agentRunner } from './services/agentService';
import { sessionService } from './services/sessionService';
import { Message, MessageRole, SessionState, Attachment } from './types';
import { ChatMessage, ThinkingBubble } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ScannerTool } from './components/ScannerTool';

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: '',
    messages: [],
    status: 'idle'
  });
  const [showScannerTool, setShowScannerTool] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'offline'>('connected');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionState.sessionId) initSession();
    window.addEventListener('online', () => setConnectionStatus('connected'));
    window.addEventListener('offline', () => setConnectionStatus('offline'));
    return () => {
      window.removeEventListener('online', () => setConnectionStatus('connected'));
      window.removeEventListener('offline', () => setConnectionStatus('offline'));
    };
  }, []);

  const initSession = () => {
    const newSessionId = sessionService.createSession();
    const greeting: Message = {
      id: uuidv4(),
      role: MessageRole.ASSISTANT,
      content: `### 🛡️ SYSTEM ONLINE: Red Team OSINT Validator
**Operational Mode:** Deep Research & Risk Assessment

Готов к анализу целей. Загрузите URL, документ (PDF/DOCX) или изображение для начала расследования.

**Функционал:**
1.  **Risk Scoring:** Оценка рисков для каждого найденного источника.
2.  **Vision OCR:** Извлечение текста из сканов и скриншотов.
3.  **Cross-Check:** Сверка данных по нескольким базам (Google Search).

*Ожидаю ввод данных...*`,
      timestamp: Date.now()
    };
    sessionService.addMessage(newSessionId, greeting);
    setSessionState({ sessionId: newSessionId, messages: [greeting], status: 'idle' });
  };

  const handleWipeSession = () => {
    if (sessionState.sessionId) {
      agentRunner.resetSession(sessionState.sessionId);
      sessionService.clearSession(sessionState.sessionId);
      const newSessionId = sessionService.createSession();
      const greeting: Message = {
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        content: `**[SYSTEM]** Сессия очищена. Память сброшена. Жду новых указаний.`,
        timestamp: Date.now()
      };
      sessionService.addMessage(newSessionId, greeting);
      setSessionState({ sessionId: newSessionId, messages: [greeting], status: 'idle' });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionState.messages, sessionState.status]);

  const handleSendMessage = async (content: string, attachment?: Attachment) => {
    if (!sessionState.sessionId) return;

    const userMsg: Message = {
      id: uuidv4(),
      role: MessageRole.USER,
      content,
      timestamp: Date.now(),
      attachment
    };

    sessionService.addMessage(sessionState.sessionId, userMsg);
    setSessionState(prev => ({ ...prev, messages: [...prev.messages, userMsg], status: 'thinking' }));

    try {
      const assistantMsgId = uuidv4();
      let currentAssistantMsg: Message = {
        id: assistantMsgId,
        role: MessageRole.ASSISTANT,
        content: '',
        timestamp: Date.now()
      };

      setSessionState(prev => ({ ...prev, messages: [...prev.messages, currentAssistantMsg] }));

      const stream = agentRunner.call_agent_async(sessionState.sessionId, content, attachment);
      let isFirstChunk = true;

      for await (const chunk of stream) {
        if (isFirstChunk) {
           setSessionState(prev => ({ ...prev, status: 'streaming' }));
           isFirstChunk = false;
        }
        currentAssistantMsg = {
          ...currentAssistantMsg,
          content: chunk.text,
          groundingChunks: chunk.groundingChunks
        };
        setSessionState(prev => ({
            ...prev,
            messages: prev.messages.map(msg => msg.id === assistantMsgId ? currentAssistantMsg : msg)
        }));
      }

      sessionService.addMessage(sessionState.sessionId, currentAssistantMsg);
      setSessionState(prev => ({ ...prev, status: 'idle' }));

    } catch (error) {
      const errorMsg: Message = {
        id: uuidv4(),
        role: MessageRole.SYSTEM,
        content: "**[CRITICAL FAILURE]** Соединение с нейроядром потеряно. Проверьте API ключ или сеть.",
        timestamp: Date.now()
      };
      sessionService.addMessage(sessionState.sessionId, errorMsg);
      setSessionState(prev => ({ ...prev, messages: [...prev.messages, errorMsg], status: 'error' }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-slate-200 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/70 backdrop-blur-md border-b border-white/5 py-3 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-800 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
           </div>
           <div>
             <h1 className="font-bold text-white text-sm md:text-base tracking-wide font-mono flex items-center gap-2">
               OSINT_VALIDATOR <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">v2.5</span>
             </h1>
             <div className="flex items-center gap-2 mt-0.5">
               <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
               <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{connectionStatus === 'connected' ? 'Neural Link Active' : 'Offline'}</p>
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button onClick={() => setShowScannerTool(true)} className="group relative px-3 py-1.5 rounded bg-slate-800/50 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 transition-all">
             <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-indigo-300 flex items-center gap-2">
               <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
               <span className="hidden sm:inline">DOM SCANNER</span>
             </span>
           </button>
           <button onClick={handleWipeSession} className="p-2 rounded bg-slate-800/50 hover:bg-red-900/20 border border-white/10 hover:border-red-500/50 transition-all text-slate-400 hover:text-red-400" title="Reset Session">
             <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
           </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto pt-20 pb-4 px-4 scroll-smooth z-10">
        <div className="max-w-4xl mx-auto flex flex-col min-h-full justify-end">
             {sessionState.messages.map((msg) => (
               <ChatMessage key={msg.id} message={msg} />
             ))}
             {sessionState.status === 'thinking' && <ThinkingBubble />}
             <div ref={messagesEndRef} className="h-24" /> {/* Spacer for floating input */}
        </div>
      </main>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} disabled={sessionState.status !== 'idle' && sessionState.status !== 'error'} />

      {/* Modals */}
      {showScannerTool && <ScannerTool onClose={() => setShowScannerTool(false)} />}
    </div>
  );
};

export default App;