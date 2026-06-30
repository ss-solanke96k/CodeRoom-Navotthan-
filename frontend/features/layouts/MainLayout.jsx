import React from 'react';

export default function MainLayout({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-[#0d0d1b] text-slate-100 font-sans flex flex-col justify-center items-center px-4 relative overflow-hidden ${className}`}>
      {/* Immersive technical grid and radiant lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#312e810a_1px,transparent_1px),linear-gradient(to_bottom,#312e810a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      
      {/* Centered Children Container */}
      <div className="relative z-10 w-full flex flex-col justify-center items-center">
        {children}
      </div>
    </div>
  );
}
