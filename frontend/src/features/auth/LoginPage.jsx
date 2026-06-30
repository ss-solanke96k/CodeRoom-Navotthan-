import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../shared/hooks/useAuth.js';
import { Code, Key, Mail, User, ShieldCheck, Zap } from 'lucide-react';
import Button from '../../shared/components/Button.jsx';
import Input from '../../shared/components/Input.jsx';
import Alert from '../../shared/components/Alert.jsx';
import MainLayout from '../../src/layouts/MainLayout.jsx';

export default function LoginPage() {
  const { login, register, loading, error, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  
  // Fields state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (activeTab === 'signin') {
      await login({ credential: username.trim(), password });
    } else {
      const isOk = await register({ username: username.trim(), email: email.trim(), password });
      if (isOk) {
        setSuccessMsg('Account registered successfully! Automatic session starting...');
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    clearError();
    setSuccessMsg('');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <MainLayout>
      {/* Main Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#141426]/90 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden"
      >
        {/* Glow accent bar at top edge */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-400" />

        {/* Brand visual header */}
        <div className="text-center mb-8 select-none">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-4 text-indigo-400 shadow-lg shadow-indigo-600/5">
            <Code className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            CodeRoom
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-light">
            Production collaborative workspace with Redis & MongoDB persistence
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex p-1 bg-[#090912] rounded-2xl mb-6 border border-slate-800/60">
          <button
            type="button"
            onClick={() => handleTabChange('signin')}
            className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Sign In Workspace
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('signup')}
            className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Create Credentials
          </button>
        </div>

        {/* Status notification banner */}
        <AnimatePresence mode="wait">
          {error && (
            <Alert type="error" message={error} className="mb-4" />
          )}

          {successMsg && (
            <Alert type="success" message={successMsg} className="mb-4" />
          )}
        </AnimatePresence>

        {/* Forms handling */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={activeTab === 'signin' ? 'Username or Email' : 'Display Username'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={activeTab === 'signin' ? 'Enter username/email' : 'e.g., Snehal'}
            required
            icon={User}
          />

          {activeTab === 'signup' && (
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., example@coderoom.com"
              required
              icon={Mail}
            />
          )}

          <Input
            label="Workspace Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
            minLength={6}
            required
            icon={Key}
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full mt-6"
            icon={activeTab === 'signin' ? ShieldCheck : Zap}
          >
            {activeTab === 'signin' ? 'Unlock Secure Workspace' : 'Initialize Account Credentials'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center select-none">
          <p className="text-[10px] text-slate-500 font-mono">
            JWT Secure Session • MongoDB & Redis Caching
          </p>
        </div>
      </motion.div>
    </MainLayout>
  );
}
