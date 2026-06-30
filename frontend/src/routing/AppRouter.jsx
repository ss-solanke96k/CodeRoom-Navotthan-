import React, { useState, useEffect } from 'react';
import { useAuth } from '../shared/hooks/useAuth.js';
import LoginPage from '../features/auth/LoginPage.jsx';
import LobbyPage from '../features/lobby/LobbyPage.jsx';
import EditorPage from '../features/editor/EditorPage.jsx';
import Spinner from '../shared/components/Spinner.jsx';

export default function AppRouter() {
  const { user, token, loading } = useAuth();
  
  // Capture invite code from URL query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const code = roomParam.trim().toUpperCase();
      sessionStorage.setItem('invited_room_code', code);
      console.log('[Invite Link] Parsed and saved room code from URL:', code);
    }
  }, []);
  
  // Local navigation state for active session room
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [activeRoomName, setActiveRoomName] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // loading splash screen
  if (loading && !user && token) {
    return (
      <div className="min-h-screen bg-[#0e0e1e] flex flex-col justify-center items-center font-mono text-xs text-indigo-400 select-none">
        <Spinner size="lg" text="Initializing Secure Session..." />
      </div>
    );
  }

  // Route 1: Authentication Wall
  if (!user) {
    return <LoginPage />;
  }

  // Route 2: Active Collaborative Code Workspace Page
  if (activeRoomCode && activeRoomName) {
    return (
      <EditorPage
        roomCode={activeRoomCode}
        initialRoomName={activeRoomName}
        isInitialHost={isHost}
        onLeave={() => {
          setActiveRoomCode(null);
          setActiveRoomName(null);
          setIsHost(false);
        }}
      />
    );
  }

  // Route 3: Lobby Portal
  return (
    <LobbyPage
      onJoinSuccess={(code, name, hostFlag) => {
        setActiveRoomCode(code);
        setActiveRoomName(name);
        setIsHost(hostFlag);
      }}
    />
  );
}
