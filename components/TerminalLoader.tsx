import React, { useState, useEffect } from 'react';

const LOAD_STEPS = [
  "[INIT] POLY-DORK ENGINE...",
  "[SCAN] TARGET_VECTOR ANALYSIS...",
  "[AUTH] BYPASSING SAFETY FILTERS...",
  "[NET] CRAWLING DEEP WEB...",
  "[DATA] EXTRACTING PATTERNS...",
  "[RISK] CALCULATING EXPOSURE...",
  "[SYNC] AGGREGATING RESULTS..."
];

export const TerminalLoader: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOAD_STEPS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full justify-start mb-4">
      <div className="bg-slate-950 border border-orange-500/30 rounded px-4 py-3 font-mono text-xs w-full max-w-md shadow-[0_0_15px_rgba(249,115,22,0.1)]">
        <div className="flex items-center gap-2 mb-2 border-b border-orange-500/20 pb-1">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-orange-400 font-bold">SYSTEM_PROCESS::ACTIVE</span>
        </div>
        
        <div className="space-y-1">
          {LOAD_STEPS.map((step, idx) => (
            <div key={idx} className={`${idx === stepIndex ? 'text-indigo-400 font-bold' : idx < stepIndex ? 'text-slate-600' : 'text-slate-800'}`}>
              {idx < stepIndex ? '✓' : idx === stepIndex ? '>' : ' '} {step}
            </div>
          ))}
        </div>
        
        <div className="mt-2 text-orange-500 blink">_WAITING_FOR_RESPONSE█</div>
      </div>
    </div>
  );
};