import React from 'react';

export default function AiChat() {
  return (
    <div className="flex-1 flex flex-col glass-panel rounded-xl border border-outline-variant/30 overflow-hidden relative shadow-2xl h-[calc(100vh-8rem)]">
      <div className="h-14 border-b border-outline-variant/30 flex items-center justify-between px-6 bg-surface-container-low/80 shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          <h2 className="font-label-mono text-label-mono text-on-surface">AEGIS_AI_ORACLE v2.4.1</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-label-mono bg-secondary/10 text-secondary border border-secondary/20 uppercase tracking-widest">Online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 font-label-mono text-sm space-y-8">
        <div className="flex flex-col gap-1 text-outline-variant">
          <span>&gt; INITIALIZING SECURE CONNECTION... [OK]</span>
          <span>&gt; CONNECTING TO 3D PRINTER API... [OK]</span>
          <div className="mt-2 text-primary terminal-text border-l-2 border-primary/50 pl-4 py-1 bg-primary/5 rounded-r">
            Aegis AI Agent ready. You can ask me to monitor the printer or execute 3D models.
          </div>
        </div>
      </div>

      <div className="p-6 bg-surface-container-low/95 border-t border-outline-variant/20 shrink-0">
        <div className="relative flex items-end gap-4">
          <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/50 rounded-xl focus-within:border-primary/50 transition-all overflow-hidden flex">
            <textarea
              className="w-full bg-transparent border-none py-3.5 px-4 text-sm text-on-surface font-label-mono focus:ring-0 outline-none resize-none placeholder:text-outline-variant"
              placeholder="Enter command or query (e.g., /start_print)"
              rows="1"
            ></textarea>
          </div>
          <button className="h-[52px] w-[52px] bg-primary text-on-primary-fixed rounded-xl hover:brightness-110 active:scale-95 transition-all duration-200 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[24px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
