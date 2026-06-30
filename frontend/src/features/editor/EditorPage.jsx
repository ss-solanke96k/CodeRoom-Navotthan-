import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRoom } from '../../shared/hooks/useRoom.js';
import { useAuth } from '../../shared/hooks/useAuth.js';
import {
  Users,
  Copy,
  Check,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  XCircle,
  LogOut,
  ChevronRight,
  Shield,
  Activity,
  Share2
} from 'lucide-react';

export default function EditorPage({
  roomCode,
  initialRoomName,
  isInitialHost,
  onLeave
}) {
  const { user } = useAuth();
  const {
    roomName,
    locked,
    version,
    participants,
    history,
    socketId,
    userColor,
    joinRealtimeRoom,
    disconnectSocket,
    leaveRoom,
    renameRoomWorkspace,
    toggleRoomLock,
    clearWorkspaceEditor,
    kickParticipant,
    updateCursorPosition,
    updateTypingStatus
  } = useRoom();

  const [text, setText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedNameInput, setEditedNameInput] = useState(initialRoomName);
  const [kicked, setKicked] = useState(false);

  // Share and Toast Notification States
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [toasts, setToasts] = useState([]);
  const lastHistoryIdRef = useRef(null);

  // Ref tracking to bypass closure values in event handlers
  const textRef = useRef('');
  const versionRef = useRef(1);
  const textareaRef = useRef(null);
  const logTerminalEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Sync refs with state values
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  // Connect to Real-time backend
  useEffect(() => {
    const socket = joinRealtimeRoom(
      roomCode,
      user?.username || 'Guest',
      () => {
        setKicked(true);
      },
      ({ delta, updatedVersion, forceOverwrite }) => {
        // 1. Check if server forces a full overwrite (e.g. host cleared the document)
        if (forceOverwrite) {
          setText('');
          return;
        }

        // 2. Diff Reconciliation & Caret Retention
        const textarea = textareaRef.current;
        const currentSelectionStart = textarea ? textarea.selectionStart : 0;
        const currentSelectionEnd = textarea ? textarea.selectionEnd : 0;

        const deltaPos = delta.index;
        const textLenChange = delta.text.length - delta.removedLength;

        // Calculate shift to restore caret focus if remote edit happened before our insertion point
        let newSelectionStart = currentSelectionStart;
        let newSelectionEnd = currentSelectionEnd;

        if (deltaPos <= currentSelectionStart) {
          newSelectionStart += textLenChange;
        }
        if (deltaPos <= currentSelectionEnd) {
          newSelectionEnd += textLenChange;
        }

        // Prevent negative index shifts
        newSelectionStart = Math.max(0, newSelectionStart);
        newSelectionEnd = Math.max(0, newSelectionEnd);

        // 3. Patch local document code block
        const prevText = textRef.current;
        const before = prevText.substring(0, deltaPos);
        const after = prevText.substring(deltaPos + delta.removedLength);
        const updatedText = before + delta.text + after;

        // Update state
        setText(updatedText);

        // 4. Restore selection range on next render frame to bypass jump-to-end bug
        requestAnimationFrame(() => {
          if (textarea) {
            textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
          }
        });
      }
    );

    // Sync initial code document on connection safely
    const handleInitialRoomState = ({ room }) => {
      setText(room.document || '');
    };
    socket?.on('room-state', handleInitialRoomState);

    // Auto-focus editor on join
    setTimeout(() => textareaRef.current?.focus(), 100);

    return () => {
      disconnectSocket();
    };
  }, [roomCode, user?.username, joinRealtimeRoom, disconnectSocket]);

  // Handle cleanup and disconnect only when the page is fully unmounted/exited
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  // Handle logs auto-scrolling
  useEffect(() => {
    setTimeout(() => {
      logTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, [history]);

  // Real-time notifications listener triggered from room terminal logs updates
  useEffect(() => {
    if (history.length === 0) return;

    const latestLog = history[history.length - 1];

    if (latestLog.id !== lastHistoryIdRef.current) {
      // Avoid rendering notifications for historical logs loaded on initial room entry
      if (lastHistoryIdRef.current !== null) {
        let type = 'info';
        
        const actionStr = latestLog.action.toLowerCase();
        if (actionStr.includes('joined')) {
          type = 'join';
        } else if (actionStr.includes('left') || actionStr.includes('disconnected') || actionStr.includes('removed') || actionStr.includes('kicked')) {
          type = 'leave';
        } else if (actionStr.includes('edited')) {
          type = 'edit';
        }

        const newToast = {
          id: latestLog.id,
          username: latestLog.username,
          action: latestLog.action,
          type,
          timestamp: new Date(latestLog.timestamp)
        };

        setToasts((prev) => {
          const updated = [...prev, newToast];
          if (updated.length > 4) updated.shift(); // Keep max 4 concurrent notifications floating
          return updated;
        });

        // Expire the notification toast after 4 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== latestLog.id));
        }, 4000);
      }
      
      lastHistoryIdRef.current = latestLog.id;
    }
  }, [history]);

  // Copy Room Code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Copy Direct Invite/Classroom Link to clipboard
  const handleShareLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setIsShareCopied(true);
    setTimeout(() => setIsShareCopied(false), 3000);
  };

  // Extract character delta on client typing inside textarea
  const handleEditorChange = (e) => {
    const prevText = textRef.current;
    const currentText = e.target.value;
    
    // Caret point
    const selectionStart = e.target.selectionStart;

    // 1. General character-matching diff extraction engine
    let i = 0;
    while (i < prevText.length && i < currentText.length && prevText[i] === currentText[i]) {
      i++;
    }

    let j = 0;
    while (
      j < prevText.length - i &&
      j < currentText.length - i &&
      prevText[prevText.length - 1 - j] === currentText[currentText.length - 1 - j]
    ) {
      j++;
    }

    const index = i;
    const removedLength = prevText.length - i - j;
    const insertedText = currentText.substring(i, currentText.length - j);

    // Apply change locally immediately (Optimistic state)
    setText(currentText);

    // Prepare Delta Package
    const deltaPkg = {
      index,
      text: insertedText,
      removedLength,
      author: user?.username || 'Guest',
      version: versionRef.current
    };

    // 2. Emit delta to server via Socket Service hook
    import('../../shared/services/socketService.js').then(({ socketService }) => {
      socketService.sendDelta(roomCode, deltaPkg);
    });

    // 3. Coordinate cursor indexing
    handleCursorIndexChange(selectionStart);

    // 4. Typing Status triggers
    handleTypingIndicator();
  };

  // Capture selection position on user navigating code with clicks, keystrokes, etc.
  const handleCursorIndexChange = (index) => {
    updateCursorPosition(roomCode, index);
  };

  const handleTextAreaSelection = (e) => {
    const index = e.currentTarget.selectionStart;
    handleCursorIndexChange(index);
  };

  // Throttled & Debounced Typing Indicator Engine
  const handleTypingIndicator = () => {
    if (typingTimeoutRef.current === null) {
      updateTypingStatus(roomCode, true);
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    // Clear typing indicator after 1.5s of no key actions
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(roomCode, false);
      typingTimeoutRef.current = null;
    }, 1500);
  };

  // Host Privilege Operations
  const handleHostRename = (e) => {
    e.preventDefault();
    if (!editedNameInput.trim() || editedNameInput === roomName) {
      setIsEditingName(false);
      return;
    }
    renameRoomWorkspace(roomCode, editedNameInput.trim());
    setIsEditingName(false);
  };

  const handleHostToggleLock = () => {
    toggleRoomLock(roomCode, !locked);
  };

  const handleHostClearEditor = () => {
    if (window.confirm('Are you sure you want to clear the entire code workspace for all members?')) {
      clearWorkspaceEditor(roomCode);
      setText('');
    }
  };

  const handleHostKickParticipant = (targetSocketId, targetName) => {
    if (window.confirm(`Are you sure you want to kick participant "${targetName}" from this CodeRoom?`)) {
      kickParticipant(roomCode, targetSocketId);
    }
  };

  // Calculate coordinates or line positions of users' cursor
  const getLineMapForParticipant = (p) => {
    if (p.cursorIndex === undefined || !p.isActive) return null;
    const documentPart = text.substring(0, p.cursorIndex);
    return documentPart.split('\n').length;
  };

  // Generate line numbers gutter list
  const lines = text.split('\n');

  // Determine current active self
  const selfParticipant = participants.find(p => p.id === socketId);
  const isHost = selfParticipant?.isHost || isInitialHost;

  return (
    <div className="min-h-screen bg-[#090911] text-slate-200 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* 1. TOP HEADER BANNER */}
      <header className="bg-[#121225] border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            {isEditingName && isHost ? (
              <form onSubmit={handleHostRename} className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedNameInput}
                  onChange={(e) => setEditedNameInput(e.target.value)}
                  maxLength={30}
                  className="bg-[#0b0b14] border border-indigo-500/50 rounded-lg px-2.5 py-1 text-sm font-display font-medium text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                  onBlur={() => setIsEditingName(false)}
                />
                <button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-2 py-1 rounded-md transition-colors cursor-pointer">
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-semibold tracking-tight text-slate-100">
                  {roomName || initialRoomName}
                </h2>
                {isHost && (
                  <button
                    onClick={() => { setEditedNameInput(roomName || initialRoomName); setIsEditingName(true); }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Rename Room"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <span>Client Version: v{version}</span>
              <span className="text-slate-600">•</span>
              <span>Identity: <span className="font-semibold text-indigo-400">{user?.username}</span></span>
              {isHost && <span className="ml-1.5 px-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[9px] font-sans font-medium uppercase tracking-wide">Host</span>}
            </p>
          </div>
        </div>

        {/* Room Code Indicator with Click to Copy */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0a0a16] border border-slate-800 rounded-xl py-1.5 px-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Code</span>
            <span className="text-sm font-semibold text-slate-200 tracking-wider font-mono">{roomCode}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-100 transition-colors ml-1 cursor-pointer"
              title="Copy Room Code"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Copy Direct Invite/Classroom Link button */}
          <button
            onClick={handleShareLink}
            className={`flex items-center gap-1.5 border px-3.5 py-1.5 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              isShareCopied
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/20 text-white shadow-lg shadow-indigo-600/10'
            }`}
            title="Copy Direct Invitation Link to Share"
          >
            {isShareCopied ? (
              <>
                <Check className="w-4 h-4" />
                Link Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Invite Partners
              </>
            )}
          </button>

          <button
            onClick={onLeave}
            className="flex items-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 hover:border-rose-500/40 text-rose-400 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer select-none"
          >
            <LogOut className="w-4 h-4" />
            Exit Workspace
          </button>
        </div>
      </header>

      {/* KICKED MODAL BLOCKED OVERLAY */}
      <AnimatePresence>
        {kicked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#090911]/95 backdrop-blur-md flex flex-col justify-center items-center z-50 p-6 text-center select-none"
          >
            <div className="w-16 h-16 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-display font-semibold text-rose-400">Kicked from Workspace</h1>
            <p className="text-slate-400 text-sm max-w-sm mt-2">
              The room host has removed you from this collaborative workspace. You no longer have access to edit this document.
            </p>
            <button
              onClick={onLeave}
              className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
            >
              Return to Lobby
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER WORKSPACE SECTION */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. COLLABORATIVE MONOSPACE EDITOR (LEFT-CENTRAL BLOCK) */}
        <div className="flex-1 flex bg-[#0c0c16] relative overflow-hidden h-full">
          {/* Editor Gutter Line Numbers */}
          <div className="w-14 bg-[#0a0a12] border-r border-slate-800/60 py-4 font-mono text-[13px] text-slate-600 text-right pr-3.5 select-none overflow-hidden h-full flex flex-col items-stretch relative">
            <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden" style={{ top: '16px' }}>
              {lines.map((_, i) => {
                const lineNum = i + 1;
                // Check if any remote participant is on this line number
                const usersOnLine = participants.filter(p => p.id !== socketId && getLineMapForParticipant(p) === lineNum);
                
                return (
                  <div key={i} className="h-6 leading-6 relative group flex justify-end items-center">
                    {/* Collaborative cursor presence glow on line number gutter */}
                    {usersOnLine.length > 0 && (
                      <div className="absolute left-0.5 inset-y-0.5 w-1 rounded-r-md transition-all" style={{ backgroundColor: usersOnLine[0].color }} />
                    )}
                    
                    <span className={`transition-colors duration-150 ${usersOnLine.length > 0 ? 'text-indigo-400 font-semibold' : 'text-slate-600'}`}>
                      {lineNum}
                    </span>

                    {/* Hover tooltip indicating who is on this line */}
                    {usersOnLine.length > 0 && (
                      <div className="absolute left-10 scale-0 group-hover:scale-100 transition-transform origin-left bg-[#121224] border border-slate-800 py-1 px-2 rounded-md shadow-xl text-[10px] text-white z-20 pointer-events-none font-sans flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: usersOnLine[0].color }} />
                        <span>{usersOnLine.map(u => u.username).join(', ')} editing</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actual Code Area */}
          <div className="flex-1 h-full relative overflow-y-auto overflow-x-hidden">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleEditorChange}
              onKeyUp={handleTextAreaSelection}
              onMouseUp={handleTextAreaSelection}
              onClick={handleTextAreaSelection}
              spellCheck={false}
              className="w-full h-full min-h-[500px] bg-transparent text-slate-100 font-mono text-[14px] leading-6 py-4 px-5 outline-none border-none resize-none overflow-y-auto whitespace-pre overflow-x-auto tab-size-4"
              placeholder="// Write collaborative code here with your team..."
              style={{ tabSize: 2 }}
            />

            {/* Float Presence typing badge at bottom edge */}
            <div className="absolute bottom-4 left-5 bg-indigo-950/80 border border-indigo-500/20 rounded-full px-3 py-1 text-[11px] text-indigo-300 font-medium font-sans shadow-lg flex items-center gap-2 backdrop-blur-sm pointer-events-none transition-all duration-300">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
              <span>
                {participants.filter(p => p.isActive && p.isTyping && p.id !== socketId).length > 0 ? (
                  `${participants.filter(p => p.isActive && p.isTyping && p.id !== socketId).map(u => u.username).join(', ')} typing...`
                ) : (
                  'Synced Workspace Live'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 3. SIDE PANEL: COLLABORATORS, HOST CONSOLE, LOGS (RIGHT BLOCK) */}
        <aside className="w-[340px] border-l border-slate-800/80 bg-[#10101f] flex flex-col shrink-0 h-full overflow-hidden select-none">
          
          {/* PART A: ACTIVE MEMBERS LIST */}
          <div className="p-4 border-b border-slate-800/50 flex flex-col h-[230px] overflow-hidden shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
                <Users className="w-3.5 h-3.5" />
                Active Co-Editors ({participants.filter(p => p.isActive).length})
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {participants.map((p) => {
                const isUserSelf = p.id === socketId;
                const line = getLineMapForParticipant(p);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                      isUserSelf ? 'bg-indigo-950/25 border border-indigo-500/10' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/* Color-badge with custom presence representation */}
                      <div className="relative shrink-0">
                        <div
                           className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner"
                           style={{ backgroundColor: `${p.color}15`, color: p.color, border: `1px solid ${p.color}30` }}
                        >
                          {p.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#10101f] ${
                            p.isActive ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-semibold text-slate-100 truncate max-w-[110px]">
                            {p.username}
                          </span>
                          {isUserSelf && <span className="text-[10px] text-indigo-400 font-light font-sans">(You)</span>}
                          {p.isHost && <Shield className="w-3 h-3 text-amber-500 fill-amber-500/20 shrink-0" title="Room Host" />}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[160px]">
                          {p.isActive ? (
                            p.isTyping ? (
                              <span className="text-indigo-400 animate-pulse-soft font-medium">Typing code...</span>
                            ) : line ? (
                              <span>Line {line} caret active</span>
                            ) : (
                              'Workspace focus active'
                            )
                          ) : (
                            <span className="text-slate-600 font-light">Briefly disconnected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Host privilege actions: Kick Button */}
                    {isHost && !p.isHost && (
                      <button
                        onClick={() => handleHostKickParticipant(p.id, p.username)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors cursor-pointer"
                        title="Kick Participant"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PART B: HOST LOCKS AND WORKSPACE MANAGEMENT CONTROLS */}
          {isHost && (
            <div className="p-4 border-b border-slate-800/50 bg-[#0d0d18] shrink-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2 font-sans">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                Host Control Console
              </h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={handleHostToggleLock}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    locked
                      ? 'bg-rose-950/30 text-rose-400 border-rose-500/20 hover:bg-rose-900/40'
                      : 'bg-indigo-950/30 text-indigo-400 border-indigo-500/20 hover:bg-indigo-900/40'
                  }`}
                >
                  {locked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Room Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Lock Room
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleHostClearEditor}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950/40 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Code
                </button>
              </div>
            </div>
          )}

          {/* PART C: ACTIVITY TERMINAL LOGS (STRETCH TIER 1 - REAL HISTORICAL ACTIVITY FEED) */}
          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2 font-sans shrink-0">
              <Activity className="w-3.5 h-3.5" />
              Activity Terminal Log
            </h3>
            
            <div className="flex-1 bg-[#07070d] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-400 overflow-y-auto space-y-2 select-text">
              {history.length === 0 ? (
                <div className="text-slate-600 italic">No terminal logs recorded yet...</div>
              ) : (
                history.map((log) => {
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div key={log.id} className="leading-5 flex items-start gap-1">
                      <ChevronRight className="w-3 h-3 text-indigo-500 mt-1 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-slate-600">[{timeStr}]</span>{' '}
                        <span className="text-indigo-400 font-semibold">{log.username}</span>{' '}
                        <span className="text-slate-300 font-light">{log.action}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={logTerminalEndRef} />
            </div>
          </div>

        </aside>
      </div>

      {/* REAL-TIME SLIDING TOAST NOTIFICATIONS CORNER */}
      <div className="fixed top-20 right-6 z-40 pointer-events-none flex flex-col gap-2.5 max-w-sm w-full select-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let bgStyle = 'bg-[#121225]/95 border-slate-800/80 text-slate-100';
            let accentBar = 'bg-indigo-500';
            let titleText = 'Action Alert';

            if (toast.type === 'join') {
              bgStyle = 'bg-[#0b1b17]/95 border-emerald-500/25 text-emerald-100 shadow-lg shadow-emerald-950/20';
              accentBar = 'bg-emerald-500';
              titleText = 'Member Joined';
            } else if (toast.type === 'leave') {
              bgStyle = 'bg-[#1b0b0f]/95 border-rose-500/25 text-rose-100 shadow-lg shadow-rose-950/20';
              accentBar = 'bg-rose-500';
              titleText = 'Member Left';
            } else if (toast.type === 'edit') {
              bgStyle = 'bg-[#161226]/95 border-indigo-500/25 text-indigo-100 shadow-lg shadow-indigo-950/20';
              accentBar = 'bg-indigo-500';
              titleText = 'Code Edited';
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 120, scale: 0.9, transition: { duration: 0.2 } }}
                layout
                className={`pointer-events-auto w-full p-3.5 rounded-2xl border backdrop-blur-md flex gap-3 relative overflow-hidden shadow-2xl ${bgStyle}`}
              >
                {/* Glow accent line */}
                <div className={`absolute left-0 inset-y-0 w-1 ${accentBar}`} />
                
                <div className="flex-1 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase font-sans text-indigo-400">
                      {titleText}
                    </span>
                    <span className="text-[9px] font-mono opacity-50">
                      {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs mt-1.5 font-sans text-slate-300">
                    <span className="font-semibold text-slate-100">{toast.username}</span>{' '}
                    <span>{toast.action}</span>
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
