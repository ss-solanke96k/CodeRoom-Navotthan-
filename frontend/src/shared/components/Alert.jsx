import React from 'react';
import { motion } from 'motion/react';
import { Info, CheckCircle } from 'lucide-react';

export default function Alert({ type = 'error', message = '', className = '' }) {
  if (!message) return null;

  const styles = {
    error: 'bg-rose-950/40 border-rose-500/30 text-rose-400',
    success: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400',
    info: 'bg-blue-950/40 border-blue-500/30 text-blue-400'
  };

  const Icon = type === 'success' ? CheckCircle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`overflow-hidden w-full ${className}`}
    >
      <div className={`p-3.5 border rounded-xl text-xs flex gap-2.5 items-center font-sans ${styles[type]}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span>{message}</span>
      </div>
    </motion.div>
  );
}
