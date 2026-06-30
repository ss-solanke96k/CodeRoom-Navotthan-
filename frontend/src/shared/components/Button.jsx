import React from 'react';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  icon: Icon,
  loading = false,
  ...props
}) {
  const baseStyle = "font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus:ring-2 select-none shrink-0";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-800 text-white shadow-lg shadow-indigo-600/20 focus:ring-indigo-500/50",
    secondary: "bg-[#090912] hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 focus:ring-slate-700/50",
    danger: "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-800 text-white shadow-lg shadow-rose-600/20 focus:ring-rose-500/50",
    success: "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-800 text-white focus:ring-emerald-500/50",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 focus:ring-slate-700/50 py-1.5 px-3 rounded-lg"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
        </>
      )}
    </button>
  );
}
