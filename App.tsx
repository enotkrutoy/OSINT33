import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { agentRunner } from './services/agentService';
import { sessionService, SessionSummary } from './services/sessionService';
import { Message, MessageRole, SessionState, Attachment } from './types';
import { ChatMessage, TerminalLoader } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ScannerTool } from './components/ScannerTool';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: '',
    messages: [],
    status: 'idle'
  });
  const [showScannerTool, setShowScannerTool] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'offline'>('connected');
  const [sessionList, setSessionList] = useState<SessionSummary[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Sessions List
  const refreshSessionList = () => {
    setSessionList(sessionService.getSessionsSummary());
  };

  useEffect(() => {
    refreshSessionList();
    // Auto-create session if none exist
    if (sessionService.getSessionsSummary().length === 0) {
      initSession();
    } else {
      // Load most recent
      const recent = sessionService.getSessionsSummary()[0];
      loadSession(recent.id);
    }

    window.addEventListener('online', () => setConnectionStatus('connected'));
    window.addEventListener('offline', () => setConnectionStatus('offline'));
    return () => {
      window.removeEventListener('online', () => setConnectionStatus('connected'));
      window.removeEventListener('offline', () => setConnectionStatus('offline'));
    };
  }, []);

  const loadSession = (id: string) => {
    const history = sessionService.getHistory(id);
    setSessionState({
      sessionId: id,
      messages: history,
      status: 'idle'
    });
    setIsSidebarOpen(false);
  };

  const initSession = () => {
    const newSessionId = sessionService.createSession();
    const greeting: Message = {
      id: uuidv4(),
      role: MessageRole.ASSISTANT,
      content: `### 🛡️ TACTICAL AUDITOR v6.0 ONLINE
**Operational Mode:** Hunter-Killer / Deep OSINT

Готов к сбору разведданных.
Поддерживаю:
1.  **Poly-Dorking:** Автоматическая генерация поисковых запросов для поиска утечек.
2.  **Document Forensics:** Анализ PDF/DOC/Images на предмет метаданных и скрытого текста.
3.  **Risk Assessment:** Структурированный аудит найденных уязвимостей.

*Введите цель (Домен, IP, ФИО) или загрузите файл...*`,
      timestamp: Date.now()
    };
    sessionService.addMessage(newSessionId, greeting);
    setSessionState({ sessionId: newSessionId, messages: [greeting], status: 'idle' });
    refreshSessionList();
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Удалить этот лог операции безвозвратно?")) {
      sessionService.clearSession(id);
      agentRunner.resetSession(id);
      refreshSessionList();
      if (sessionState.sessionId === id) {
        initSession();
      }
    }
  };

  const handleExportSession = (format: 'json' | 'md') => {
    if (!sessionState.messages.length) return;

    if (format === 'json') {
      const report = {
        timestamp: new Date().toISOString(),
        sessionId: sessionState.sessionId,
        messages: sessionState.messages.map(m => ({
          role: m.role,
          time: new Date(m.timestamp).toLocaleTimeString(),
          content: m.content,
          sources: m.groundingChunks?.map(g => g.web?.uri)
        }))
      };
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint_report_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Markdown Export
      let mdContent = `# OSINT REPORT - ${new Date().toLocaleString()}\n\n`;
      sessionState.messages.forEach(msg => {
        const role = msg.role === MessageRole.USER ? 'USER' : 'AUDITOR';
        mdContent += `### [${role}] ${new Date(msg.timestamp).toLocaleTimeString()}\n`;
        mdContent += `${msg.content}\n\n`;
        if (msg.groundingChunks && msg.groundingChunks.length) {
          mdContent += `**Sources:**\n`;
          msg.groundingChunks.forEach(s => {
             if (s.web) mdContent += `- [${s.web.title}](${s.web.uri})\n`;
          });
          mdContent += `\n`;
        }
        mdContent += `---\n\n`;
      });
      navigator.clipboard.writeText(mdContent);
      alert("Отчет скопирован в буфер обмена (Markdown)");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionState.messages, sessionState.status]);

  // Core Agent execution logic
  const executeAgent = async (sessionId: string, userContent: string, attachment?: Attachment) => {
    try {
      const assistantMsgId = uuidv4();
      let currentAssistantMsg: Message = {
        id: assistantMsgId,
        role: MessageRole.ASSISTANT,
        content: '',
        timestamp: Date.now()
      };

      setSessionState(prev => ({ ...prev, messages: [...prev.messages, currentAssistantMsg], status: 'streaming' }));

      const stream = agentRunner.call_agent_async(sessionId, userContent, attachment);
      let isFirstChunk = true;

      for await (const chunk of stream) {
        if (isFirstChunk) isFirstChunk = false;
        
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

      sessionService.addMessage(sessionId, currentAssistantMsg);
      setSessionState(prev => ({ ...prev, status: 'idle' }));
      refreshSessionList();
    } catch (error) {
      const errorMsg: Message = {
        id: uuidv4(),
        role: MessageRole.SYSTEM,
        content: "**[CRITICAL FAILURE]** Связь с ядром потеряна. Проверьте API ключ.",
        timestamp: Date.now()
      };
      sessionService.addMessage(sessionId, errorMsg);
      setSessionState(prev => ({ ...prev, messages: [...prev.messages, errorMsg], status: 'error' }));
    }
  };

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
    refreshSessionList();

    await executeAgent(sessionState.sessionId, content, attachment);
  };

  const handleRegenerate = async (messageId: string) => {
    if (sessionState.status !== 'idle' && sessionState.status !== 'error') return;

    // Find the message index
    const msgIndex = sessionState.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Ensure it's an assistant message and there is a preceding user message
    const prevMsg = sessionState.messages[msgIndex - 1];
    if (!prevMsg || prevMsg.role !== MessageRole.USER) return;

    // Truncate history in storage (remove this assistant message)
    sessionService.truncateHistory(sessionState.sessionId, messageId, true);
    
    // Update local state (remove this assistant message)
    setSessionState(prev => ({
      ...prev,
      messages: prev.messages.slice(0, msgIndex),
      status: 'thinking'
    }));

    // Re-run agent with previous user input
    await executeAgent(sessionState.sessionId, prevMsg.content, prevMsg.attachment);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (sessionState.status !== 'idle' && sessionState.status !== 'error') return;

    const msgIndex = sessionState.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = sessionState.messages[msgIndex];
    if (targetMsg.role !== MessageRole.USER) return;

    // Update storage: Update text AND remove everything after this message
    sessionService.updateMessage(sessionState.sessionId, messageId, newContent);
    sessionService.truncateHistory(sessionState.sessionId, messageId, false); // false = don't remove self, remove after

    // Update state: Slice messages up to this one, update content
    const updatedMessages = sessionState.messages.slice(0, msgIndex + 1);
    updatedMessages[msgIndex] = { ...targetMsg, content: newContent };

    setSessionState(prev => ({
      ...prev,
      messages: updatedMessages,
      status: 'thinking'
    }));

    // Re-run agent
    await executeAgent(sessionState.sessionId, newContent, targetMsg.attachment);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505] text-slate-200 relative overflow-hidden font-inter">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none"></div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessionList}
        currentSessionId={sessionState.sessionId}
        onSelectSession={loadSession}
        onNewSession={initSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 py-3 px-4 md:px-6 flex items-center justify-between transition-all duration-300" style={{ paddingLeft: isSidebarOpen ? '19rem' : undefined }}>
        <div className="flex items-center gap-3">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-white rounded hover:bg-white/5">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
           </button>

           <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-rose-900 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse hidden md:flex">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10h-10V2z"/><path d="M12 12 2.1 12a10 10 0 0 1 9.9-10v10z"/></svg>
           </div>
           <div>
             <h1 className="font-bold text-white text-sm md:text-base tracking-wide font-mono flex items-center gap-2">
               HUNTER_KILLER <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">v6.0</span>
             </h1>
             <div className="flex items-center gap-2 mt-0.5">
               <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
               <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider hidden sm:block">{connectionStatus === 'connected' ? 'TARGET ACQUIRED' : 'OFFLINE'}</p>
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
           <button onClick={() => setShowScannerTool(true)} className="hidden md:flex group relative px-3 py-1.5 rounded bg-slate-800/50 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 transition-all items-center gap-2">
               <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
               <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-indigo-300">DOM SCANNER</span>
           </button>
           
           <button onClick={() => handleExportSession('md')} className="p-2 rounded bg-slate-800/50 hover:bg-blue-900/20 border border-white/10 hover:border-blue-500/50 transition-all text-slate-400 hover:text-blue-400" title="Copy History (Markdown)">
             <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
           </button>

           <button onClick={() => handleExportSession('json')} className="p-2 rounded bg-slate-800/50 hover:bg-emerald-900/20 border border-white/10 hover:border-emerald-500/50 transition-all text-slate-400 hover:text-emerald-400" title="Export JSON">
             <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main 
        className={`flex-1 overflow-y-auto pt-20 pb-4 px-4 scroll-smooth z-10 transition-all duration-300`}
        style={{ marginLeft: isSidebarOpen ? '18rem' : '0' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col min-h-full justify-end">
             {sessionState.messages.map((msg, index) => (
               <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  isLast={index === sessionState.messages.length - 1}
                  onRegenerate={handleRegenerate}
                  onEdit={handleEditMessage}
               />
             ))}
             {sessionState.status === 'thinking' && <TerminalLoader />}
             <div ref={messagesEndRef} className="h-24" /> {/* Spacer for floating input */}
        </div>
      </main>

      {/* Input Area */}
      <div style={{ marginLeft: isSidebarOpen ? '18rem' : '0' }} className="transition-all duration-300">
         <ChatInput onSend={handleSendMessage} disabled={sessionState.status !== 'idle' && sessionState.status !== 'error'} />
      </div>

      {/* Modals */}
      {showScannerTool && <ScannerTool onClose={() => setShowScannerTool(false)} />}
    </div>
  );
};

export default App;