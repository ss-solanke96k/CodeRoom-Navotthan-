import React from 'react';

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className={`space-y-2 w-full ${className}`}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-[#0a0a14] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
          {...props}
        />
      </div>
    </div>
  );
}
