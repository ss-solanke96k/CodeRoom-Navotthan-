import mongoose, { Schema } from 'mongoose';

// Participant Schema embedded
const ParticipantSchema = new Schema({
  id: { type: String, required: true }, // socket.id
  username: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  cursorIndex: { type: Number, default: 0 },
  color: { type: String, required: true },
  isTyping: { type: Boolean, default: false }
}, { id: false });

// ActivityLog Schema embedded
const ActivityLogSchema = new Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { id: false });

// Room Schema
const RoomSchema = new Schema({
  roomCode: { type: String, required: true, unique: true, uppercase: true },
  roomName: { type: String, required: true, trim: true },
  document: { type: String, default: '' },
  hostUsername: { type: String, required: true },
  hostSocketId: { type: String, required: true },
  locked: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  participants: [ParticipantSchema],
  history: [ActivityLogSchema],
  createdAt: { type: Date, default: Date.now }
});

export const MongoRoom = mongoose.models.Room || mongoose.model('Room', RoomSchema);
