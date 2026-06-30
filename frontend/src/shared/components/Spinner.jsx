import React from 'react';

export default function Spinner({ size = 'md', text = '', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  };

  return (
    <div className={`flex flex-col justify-center items-center gap-3 ${className}`}>
      <div className={`${sizes[size]} border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin`} />
      {text && (
        <span className="font-mono text-xs text-indigo-400 tracking-wider uppercase animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}
