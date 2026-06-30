import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  roomCode: null,
  roomName: null,
  hostUsername: null,
  hostSocketId: null,
  locked: false,
  version: 1,
  participants: [],
  history: [],
  socketId: null,
  userColor: null,
  error: null
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoomState: (state, action) => {
      const { room, yourId, yourColor } = action.payload;
      state.roomCode = room.roomCode;
      state.roomName = room.roomName;
      state.hostUsername = room.hostUsername;
      state.hostSocketId = room.hostSocketId;
      state.locked = room.locked;
      state.version = room.version;
      state.participants = room.participants;
      state.history = room.history;
      state.socketId = yourId;
      state.userColor = yourColor;
      state.error = null;
    },
    updateParticipants: (state, action) => {
      state.participants = action.payload;
    },
    updateLogs: (state, action) => {
      state.history = action.payload;
    },
    updateRoomDetails: (state, action) => {
      state.roomName = action.payload.roomName;
      state.locked = action.payload.locked;
    },
    updateParticipantCursor: (state, action) => {
      state.participants = state.participants.map(p => {
        if (p.id === action.payload.userId) {
          return { ...p, cursorIndex: action.payload.cursorIndex };
        }
        return p;
      });
    },
    updateParticipantTyping: (state, action) => {
      state.participants = state.participants.map(p => {
        if (p.id === action.payload.userId) {
          return { ...p, isTyping: action.payload.isTyping };
        }
        return p;
      });
    },
    setRoomError: (state, action) => {
      state.error = action.payload;
    },
    clearRoomState: (state) => {
      return initialState;
    }
  }
});

export const {
  setRoomState,
  updateParticipants,
  updateLogs,
  updateRoomDetails,
  updateParticipantCursor,
  updateParticipantTyping,
  setRoomError,
  clearRoomState
} = roomSlice.actions;

export default roomSlice.reducer;
