import React from 'react';
import { SessionSummary } from '../services/sessionService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionSummary[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewSession,
  onDeleteSession 
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`
          fixed top-0 left-0 h-full w-72 bg-[#020617] border-r border-white/5 z-50 pt-20 pb-4 px-3 flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="mb-4 px-2">
          <button 
            onClick={onNewSession}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_rgba(79,70,229,0.3)] hover:shadow-[0_0_15px_rgba(79,70,229,0.5)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            NEW OPERATION
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-2 mb-2">History Log</div>
          
          <div className="space-y-1">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`
                  group relative p-3 rounded cursor-pointer border transition-all
                  ${session.id === currentSessionId 
                    ? 'bg-slate-800/80 border-indigo-500/50 text-indigo-100' 
                    : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm truncate pr-6">{session.title}</span>
                  <button 
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 absolute right-2 top-3 text-slate-500 hover:text-red-400 transition-opacity p-1"
                    title="Delete Log"
                  >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {new Date(session.timestamp).toLocaleDateString()} • {new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            ))}
            
            {sessions.length === 0 && (
              <div className="text-center py-8 text-slate-600 text-xs italic">
                No active operations
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-white/5 pt-4 px-2">
           <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              SYSTEM STATUS: STABLE
           </div>
        </div>
      </aside>
    </>
  );
};