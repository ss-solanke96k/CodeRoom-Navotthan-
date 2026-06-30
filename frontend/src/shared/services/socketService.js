import { io } from 'socket.io-client';
import { store } from '../store/index.js';
import {
  setRoomState,
  updateParticipants,
  updateLogs,
  updateRoomDetails,
  updateParticipantCursor,
  updateParticipantTyping,
  setRoomError
} from '../store/roomSlice.js';

let socket = null;

export const socketService = {
  connect(roomCode, username, onKicked, onReceiveDelta) {
    if (socket) {
      socket.disconnect();
    }

    socket = io({
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    // Request Join Room Frame
    socket.emit('join-room', { roomCode, username });

    // Handle initial state setup
    socket.on('room-state', (payload) => {
      store.dispatch(setRoomState(payload));
    });

    // Handle participant updates
    socket.on('participants-updated', (participants) => {
      store.dispatch(updateParticipants(participants));
    });

    // Handle historical action updates
    socket.on('logs-updated', (logs) => {
      store.dispatch(updateLogs(logs));
    });

    // Handle room details mutation
    socket.on('room-details-updated', (details) => {
      store.dispatch(updateRoomDetails(details));
    });

    // Handle host direct kick triggers
    socket.on('kicked-signal', () => {
      onKicked();
      this.disconnect();
    });

    // Handle delta receiving
    socket.on('receive-delta', (payload) => {
      onReceiveDelta(payload);
    });

    // Handle participants cursor coordinate updates
    socket.on('cursor-updated', ({ userId, cursorIndex }) => {
      store.dispatch(updateParticipantCursor({ userId, cursorIndex }));
    });

    // Handle typing status updates
    socket.on('typing-updated', ({ userId, isTyping }) => {
      store.dispatch(updateParticipantTyping({ userId, isTyping }));
    });

    // Handle custom error triggers
    socket.on('error-msg', (msg) => {
      store.dispatch(setRoomError(msg));
    });

    return socket;
  },

  sendDelta(roomCode, delta) {
    if (socket) {
      socket.emit('send-delta', { roomCode, delta });
    }
  },

  sendCursorMove(roomCode, index) {
    if (socket) {
      socket.emit('cursor-move', { roomCode, cursorIndex: index });
    }
  },

  sendTypingStatus(roomCode, isTyping) {
    if (socket) {
      socket.emit('typing-status', { roomCode, isTyping });
    }
  },

  renameRoom(roomCode, newName) {
    if (socket) {
      socket.emit('host-rename-room', { roomCode, newName });
    }
  },

  toggleLockRoom(roomCode, locked) {
    if (socket) {
      socket.emit('host-lock-room', { roomCode, locked });
    }
  },

  clearEditor(roomCode) {
    if (socket) {
      socket.emit('host-clear-editor', { roomCode });
    }
  },

  kickParticipant(roomCode, targetSocketId) {
    if (socket) {
      socket.emit('host-kick-participant', { roomCode, targetSocketId });
    }
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
