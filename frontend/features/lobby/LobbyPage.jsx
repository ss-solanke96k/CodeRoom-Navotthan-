import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRoom } from '../../shared/hooks/useRoom.js';
import { useAuth } from '../../shared/hooks/useAuth.js';
import { Code, Users, Play, Plus, LogOut, Mail, XCircle, User } from 'lucide-react';
import Button from '../../shared/components/Button.jsx';
import Input from '../../shared/components/Input.jsx';
import Alert from '../../shared/components/Alert.jsx';
import MainLayout from '../../layouts/MainLayout.jsx';

export default function LobbyPage({ onJoinSuccess }) {
  const { user, backendStatus, logout } = useAuth();
  const { createNewRoom, verifyRoomCode } = useRoom();

  const [activeTab, setActiveTab] = useState('join');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitedCode, setInvitedCode] = useState(null);

  // Check for stored room invitation on mount
  useEffect(() => {
    const savedCode = sessionStorage.getItem('invited_room_code');
    if (savedCode) {
      const code = savedCode.trim().toUpperCase();
      setRoomCode(code);
      setInvitedCode(code);
      setActiveTab('join');
    }
  }, []);

  const handleClearInvite = () => {
    sessionStorage.removeItem('invited_room_code');
    setInvitedCode(null);
    setRoomCode('');
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    if (!roomCode.trim()) {
      setError('Please provide a 6-character workspace code.');
      return;
    }

    setLoading(true);
    try {
      const code = roomCode.trim().toUpperCase();
      const roomData = await verifyRoomCode(code);
      
      if (roomData.locked) {
        setError('This collaborative room is currently locked by the host.');
        setLoading(false);
        return;
      }

      onJoinSuccess(code, roomData.roomName, false);
      sessionStorage.removeItem('invited_room_code');
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message || 'Verification failed. Make sure the code is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!roomName.trim()) {
      setError('Please enter a room/workspace name.');
      return;
    }

    setLoading(true);
    try {
      const room = await createNewRoom(roomName.trim(), user?.username || 'Guest');
      onJoinSuccess(room.roomCode, room.roomName, true);
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg bg-[#18182b]/95 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10"
      >
        {/* Top Header - User profile & Logout button */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">User Identity</p>
              <p className="text-sm font-bold text-slate-200">{user?.username || 'Collaborator'}</p>
            </div>
          </div>

          <Button
            onClick={logout}
            variant="secondary"
            className="py-1.5 px-3 rounded-xl h-auto"
            icon={LogOut}
          >
            Sign Out
          </Button>
        </div>

        {/* Brand identity */}
        <div className="text-center mb-6 select-none">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-4 text-indigo-400">
            <Code className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-white">
            CodeRoom Lobby
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-light">
            Initialize or join collaborative code editing sessions with your team
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex p-1 bg-[#10101e] rounded-2xl mb-6 border border-slate-800/60">
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'join'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Join Session
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Workspace
          </button>
        </div>

        {/* Active Invitation Info Banner */}
        <AnimatePresence>
          {invitedCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 p-4.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs relative overflow-hidden"
            >
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={handleClearInvite}
                  className="p-1 hover:bg-indigo-900/30 rounded-md text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title="Ignore Invitation"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 items-start pr-6">
                <div className="p-2 bg-indigo-500/15 rounded-xl text-indigo-400 shrink-0">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-300 font-sans text-sm">Classroom Invitation</h4>
                  <p className="text-slate-300 mt-1">
                    You have been invited to join the active classroom <span className="font-mono font-bold text-indigo-300 bg-[#0d0d1b] px-2 py-0.5 rounded border border-indigo-950">{invitedCode}</span>.
                  </p>
                  <p className="text-slate-400 mt-1 text-[11px]">
                    The classroom code is pre-filled below. Click Connect to join your partners!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        <AnimatePresence mode="wait">
          {error && (
            <Alert type="error" message={error} className="mb-4" />
          )}
        </AnimatePresence>

        {/* Dynamic Form content */}
        <form onSubmit={activeTab === 'join' ? handleJoin : handleCreate}>
          <div className="space-y-4">
            {activeTab === 'join' ? (
              <Input
                label="Session Room Code (6 alphanumeric characters)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="e.g., K9X8J2"
                maxLength={6}
                required
                className="text-center tracking-widest font-mono uppercase"
              />
            ) : (
              <Input
                label="Workspace/Room Title"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Backend Sprint Code"
                maxLength={30}
                required
              />
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-6"
              icon={activeTab === 'join' ? Play : Plus}
            >
              {activeTab === 'join' ? 'Connect Collaborative Session' : 'Launch CodeRoom'}
            </Button>
          </div>
        </form>

        {/* Bottom Infrastructure telemetry indicators */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center select-none">
          <div className="p-2.5 bg-[#0a0a14] border border-slate-800/50 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Database</span>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${backendStatus?.mongoConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-bold text-slate-300 font-mono">
                {backendStatus?.mongoConnected ? 'MongoDB' : 'Fallback'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#0a0a14] border border-slate-800/50 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Caching</span>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${backendStatus?.redisConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-bold text-slate-300 font-mono">
                {backendStatus?.redisConnected ? 'Redis' : 'Memory'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#0a0a14] border border-slate-800/50 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Session</span>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-300 font-mono">JWT Secure</span>
            </div>
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
}
