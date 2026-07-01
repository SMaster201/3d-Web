import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Home', path: '/', icon: 'home' },
    { name: 'Detection History', path: '/history', icon: 'history' },
    { name: 'AI Chat', path: '/chat', icon: 'forum' },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <nav
        className={`fixed h-full top-0 left-0 transition-all duration-300 z-50 border-r border-outline-variant/30 bg-surface-container/60 backdrop-blur-md shadow-2xl flex flex-col py-gutter px-4 ${
          collapsed ? 'w-[80px]' : 'w-[260px]'
        }`}
      >
        <div className="flex items-center justify-between mb-8 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                visibility
              </span>
            </div>
            {!collapsed && (
              <div className="whitespace-nowrap">
                <h1 className="font-display-lg text-[18px] font-bold text-primary tracking-tight leading-none text-glow">
                  Aegis Vision
                </h1>
                <span className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                  AI Forensics
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-bright/50 p-1.5 rounded-md shrink-0"
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 flex-grow">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-200 font-label-mono text-label-mono ${
                  isActive
                    ? 'text-primary bg-primary-container/20 border-l-4 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 border-l-4 border-transparent'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-outline-variant/30 flex justify-between items-center px-2">
          <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-bright/50">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_circle
            </span>
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-bright/50">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className={`flex-1 h-screen overflow-y-auto bg-surface relative transition-all duration-300 ${
          collapsed ? 'ml-[80px]' : 'ml-[260px]'
        }`}
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

        <header className="flex justify-between items-center h-16 w-full px-8 border-b border-outline-variant/10 bg-surface-container-lowest/40 backdrop-blur-md sticky top-0 z-40">
          <div className="font-headline-lg text-[20px] text-on-surface font-semibold tracking-tight">
            Command Center
          </div>
          <div className="flex items-center gap-4">
            {/* Dynamic System Status */}
            <div className="flex items-center gap-2 bg-surface-container/50 px-3 py-1.5 rounded-full border border-outline-variant/20">
              {/* For demonstration, we show AI is online but Camera is offline */}
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
              <span className="font-label-mono text-[10px] text-yellow-400 tracking-widest uppercase">AI Agent Online</span>
            </div>
            
            {/* Language Menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container/50 border border-outline-variant/20 text-on-surface-variant hover:text-primary transition-colors">
                <span className="font-label-mono text-[10px] uppercase tracking-wider">EN</span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <div className="absolute right-0 mt-2 w-24 bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <button className="w-full px-4 py-2 text-left text-[12px] font-label-mono hover:bg-primary/10 text-primary">TW</button>
                <button className="w-full px-4 py-2 text-left text-[12px] font-label-mono hover:bg-primary/10 text-on-surface-variant">EN</button>
                <button className="w-full px-4 py-2 text-left text-[12px] font-label-mono hover:bg-primary/10 text-on-surface-variant">JP</button>
              </div>
            </div>

            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-container-max mx-auto flex flex-col gap-6 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
