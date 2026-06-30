import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/index.js';
import { apiService } from '../services/apiService.js';
import { socketService } from '../services/socketService.js';
import { clearRoomState, setRoomError } from '../store/roomSlice.js';

export function useRoom() {
  const dispatch = useAppDispatch();
  const roomState = useAppSelector((state) => state.room);

  const createNewRoom = useCallback(async (roomName, hostUsername) => {
    try {
      const data = await apiService.createRoom(roomName, hostUsername);
      return data.room;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to create room workspace.';
      dispatch(setRoomError(errMsg));
      throw new Error(errMsg);
    }
  }, [dispatch]);

  const verifyRoomCode = useCallback(async (roomCode) => {
    try {
      return await apiService.verifyRoom(roomCode);
    } catch (err) {
      const errMsg = err.response?.data?.error || `Room ${roomCode} was not found.`;
      dispatch(setRoomError(errMsg));
      throw new Error(errMsg);
    }
  }, [dispatch]);

  const joinRealtimeRoom = useCallback((
    roomCode,
    username,
    onKicked,
    onReceiveDelta
  ) => {
    return socketService.connect(roomCode, username, onKicked, onReceiveDelta);
  }, []);

  const disconnectSocket = useCallback(() => {
    socketService.disconnect();
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.disconnect();
    dispatch(clearRoomState());
  }, [dispatch]);

  const renameRoomWorkspace = useCallback((roomCode, newName) => {
    socketService.renameRoom(roomCode, newName);
  }, []);

  const toggleRoomLock = useCallback((roomCode, locked) => {
    socketService.toggleLockRoom(roomCode, locked);
  }, []);

  const clearWorkspaceEditor = useCallback((roomCode) => {
    socketService.clearEditor(roomCode);
  }, []);

  const kickParticipant = useCallback((roomCode, targetSocketId) => {
    socketService.kickParticipant(roomCode, targetSocketId);
  }, []);

  const updateCursorPosition = useCallback((roomCode, index) => {
    socketService.sendCursorMove(roomCode, index);
  }, []);

  const updateTypingStatus = useCallback((roomCode, isTyping) => {
    socketService.sendTypingStatus(roomCode, isTyping);
  }, []);

  return {
    ...roomState,
    createNewRoom,
    verifyRoomCode,
    joinRealtimeRoom,
    disconnectSocket,
    leaveRoom,
    renameRoomWorkspace,
    toggleRoomLock,
    clearWorkspaceEditor,
    kickParticipant,
    updateCursorPosition,
    updateTypingStatus
  };
}
