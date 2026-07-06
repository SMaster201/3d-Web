import React from 'react';

export default function Home() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-8rem)] min-h-[700px]">
      {/* Left Column (Feed & Controls) */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        {/* Main Video Feed Viewport */}
        <div className="glass-panel rounded-xl flex-[3] relative overflow-hidden border border-outline-variant/40 shadow-inner group bg-black/40">
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent opacity-90 pointer-events-none"></div>
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-black/60 backdrop-blur-md border border-outline-variant/30 text-white font-label-mono text-[10px] px-2 py-1 rounded-sm tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span> OFFLINE
            </span>
            <span className="bg-black/60 backdrop-blur-md border border-outline-variant/30 text-on-surface-variant font-label-mono text-[10px] px-2 py-1 rounded-sm tracking-widest">
              -- NO CAM --
            </span>
          </div>
          {/* Centered icon for offline state */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 opacity-50">
             <span className="material-symbols-outlined text-4xl text-on-surface-variant">videocam_off</span>
             <span className="font-label-mono text-xs text-on-surface-variant tracking-widest">NO SIGNAL</span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="font-label-mono text-label-mono text-on-background/70">
              FPS: N/A <br /> RES: N/A
            </div>
            <div className="font-label-mono text-[10px] text-primary/70 tracking-widest text-right">
              ai.diagnosis.engine_v0.0.1
            </div>
          </div>
        </div>

        {/* Settings Panel: Camera+AI left, Printer+Confirm right */}
        <div className="glass-panel rounded-xl p-5 border border-outline-variant/30 bg-surface-container-low/50 flex-[1]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">

            {/* Column 1: Source Input + Load Camera */}
            <div className="flex flex-col gap-3 justify-between">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                  Source Input
                </label>
                <div className="relative">
                  <select className="w-full bg-surface-container border border-outline-variant/50 text-on-surface font-label-mono text-[12px] rounded-lg py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-primary/50 transition-colors cursor-pointer">
                    <option>CAM-04 (Lobby West)</option>
                    <option>CAM-01 (Main Entrance)</option>
                    <option>CAM-08 (Server Room)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant flex items-center">
                    <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                  </div>
                </div>
              </div>

              {/* AI Model below Camera, aligned */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                  Inference Model
                </label>
                <div className="relative">
                  <select className="w-full bg-surface-container border border-outline-variant/50 text-on-surface font-label-mono text-[12px] rounded-lg py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-primary/50 transition-colors cursor-pointer">
                    <option>YOLO-v8 (Fast Tracking)</option>
                    <option>ResNet-50 (Deep Classification)</option>
                    <option>Custom_Aegis_V1</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant flex items-center">
                    <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-surface-container hover:bg-surface-bright/50 text-on-surface font-label-mono text-[11px] py-2 px-4 rounded-lg border border-outline-variant/30 transition-all whitespace-nowrap mt-auto">
                Load Camera & Model
              </button>
            </div>

            {/* Column 2: Printer Model + Confirm Settings */}
            <div className="flex flex-col gap-3 justify-between">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                  Printer Model
                </label>
                <div className="relative">
                  <select className="w-full bg-surface-container border border-outline-variant/50 text-on-surface font-label-mono text-[12px] rounded-lg py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-primary/50 transition-colors cursor-pointer">
                    <option>Aegis-Print P1</option>
                    <option>Aegis-Print X2</option>
                    <option>Aegis-Print Pro Max</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant flex items-center">
                    <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-secondary hover:bg-secondary/80 text-on-secondary font-label-mono text-[11px] py-2 px-4 font-bold rounded-lg border border-outline-variant/30 transition-all whitespace-nowrap mt-auto">
                Confirm Settings
              </button>
            </div>

            {/* Column 3: Connection Status Summary */}
            <div className="flex flex-col gap-3 justify-center">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
                  <span className="font-label-mono text-[11px] text-on-surface-variant">Camera: <span className="text-outline">Disconnected</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
                  <span className="font-label-mono text-[11px] text-on-surface-variant">AI Model: <span className="text-outline">Not Loaded</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
                  <span className="font-label-mono text-[11px] text-on-surface-variant">Printer: <span className="text-outline">Disconnected</span></span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column (Logs & Stats) */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        {/* System Logs */}
        <div className="glass-panel rounded-xl flex-grow flex flex-col border border-outline-variant/30 overflow-hidden bg-surface-container-lowest/80">
          <div className="p-3 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">terminal</span>
              <h3 className="font-label-mono text-label-mono text-on-surface tracking-wider">System Logs</h3>
            </div>
            <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
          </div>
          <div className="flex-grow p-4 overflow-y-auto log-scroll font-label-mono text-[11px] leading-relaxed text-on-surface-variant bg-[#060e20]">
            <div className="flex flex-col gap-1.5 opacity-80">
              <p><span className="text-primary/70">[SYS]</span> Aegis Vision initialized.</p>
              <p><span className="text-primary/70">[SYS]</span> Waiting for device connections...</p>
              <p className="text-outline"><span className="text-primary/70">[CAM]</span> No camera connected.</p>
              <p className="text-outline"><span className="text-primary/70">[AI ]</span> No model loaded.</p>
              <p className="text-outline"><span className="text-primary/70">[PRT]</span> No printer connected.</p>
              <p className="text-on-background opacity-50 italic animate-pulse mt-2">Awaiting new events...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
