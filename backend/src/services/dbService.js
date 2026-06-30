import bcrypt from 'bcryptjs';
import { MongoUser } from '../models/User.js';
import { MongoRoom } from '../models/Room.js';
import { fallbackMemoryDB, saveFallbackDB } from '../models/fallbackDb.js';
import { checkMongoState } from '../config/database.js';

export const dbService = {
  // USER COLLECTION ACTIONS
  async createUser(userData) {
    if (checkMongoState()) {
      const user = new MongoUser(userData);
      await user.save();
      return { id: user._id.toString(), username: user.username, email: user.email };
    } else {
      // Memory Fallback Action
      const existingUser = fallbackMemoryDB.users.find(
        (u) => u.username.toLowerCase() === userData.username.toLowerCase() || u.email.toLowerCase() === userData.email.toLowerCase()
      );
      if (existingUser) {
        throw new Error('Username or Email already registered.');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = {
        id: Math.random().toString(36).substring(2, 9),
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        createdAt: new Date()
      };
      
      fallbackMemoryDB.users.push(newUser);
      saveFallbackDB();
      return { id: newUser.id, username: newUser.username, email: newUser.email };
    }
  },

  async findUserByUsername(username) {
    if (checkMongoState()) {
      return await MongoUser.findOne({ username: new RegExp(`^${username}$`, 'i') });
    } else {
      const user = fallbackMemoryDB.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      return user || null;
    }
  },

  async findUserByEmail(email) {
    if (checkMongoState()) {
      return await MongoUser.findOne({ email: email.toLowerCase() });
    } else {
      const user = fallbackMemoryDB.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return user || null;
    }
  },

  // ROOM COLLECTION ACTIONS
  async getRoom(roomCode) {
    if (!roomCode || typeof roomCode !== 'string') return null;
    const code = roomCode.trim().toUpperCase();
    if (checkMongoState()) {
      const rm = await MongoRoom.findOne({ roomCode: code });
      return rm ? rm.toObject() : null;
    } else {
      const rm = fallbackMemoryDB.rooms[code];
      return rm || null;
    }
  },

  async createRoom(roomCode, roomName, hostUsername, hostSocketId) {
    if (!roomCode || typeof roomCode !== 'string') throw new Error('Invalid room code');
    const code = roomCode.trim().toUpperCase();
    const defaultTemplate = `/**
 * Welcome to CodeRoom!
 * Shared Document Code: ${code}
 * Host: ${hostUsername}
 */

function greetTeam() {
  console.log("Welcome to collaborative editing inside room ${code}!");
}

greetTeam();
`;

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const host = {
      id: hostSocketId,
      username: hostUsername,
      isHost: true,
      isActive: true,
      color: randomColor,
      cursorIndex: 0,
      isTyping: false
    };

    const initialLog = {
      id: Math.random().toString(36).substring(2, 9),
      username: 'System',
      action: `Room "${roomName}" created by ${hostUsername}.`,
      timestamp: new Date()
    };

    const roomPayload = {
      roomCode: code,
      roomName,
      document: defaultTemplate,
      hostUsername,
      hostSocketId,
      locked: false,
      version: 1,
      participants: [host],
      history: [initialLog],
      createdAt: new Date()
    };

    if (checkMongoState()) {
      const room = new MongoRoom(roomPayload);
      await room.save();
      return room.toObject();
    } else {
      fallbackMemoryDB.rooms[code] = roomPayload;
      saveFallbackDB();
      return roomPayload;
    }
  },

  async saveRoom(room) {
    const code = room.roomCode.toUpperCase();
    if (checkMongoState()) {
      const plainRoom = room.toObject ? room.toObject() : { ...room };
      delete plainRoom._id;
      if (Array.isArray(plainRoom.participants)) {
        plainRoom.participants = plainRoom.participants.map(p => {
          const pCopy = p.toObject ? p.toObject() : { ...p };
          delete pCopy._id;
          return pCopy;
        });
      }
      if (Array.isArray(plainRoom.history)) {
        plainRoom.history = plainRoom.history.map(h => {
          const hCopy = h.toObject ? h.toObject() : { ...h };
          delete hCopy._id;
          return hCopy;
        });
      }

      return await MongoRoom.findOneAndUpdate(
        { roomCode: code },
        { $set: plainRoom },
        { new: true, useFindAndModify: false }
      );
    } else {
      fallbackMemoryDB.rooms[code] = room;
      saveFallbackDB();
      return room;
    }
  },

  async updateRoomDocument(roomCode, document, version) {
    if (!roomCode || typeof roomCode !== 'string') return { success: false };
    const code = roomCode.trim().toUpperCase();
    if (checkMongoState()) {
      const updated = await MongoRoom.findOneAndUpdate(
        { roomCode: code },
        { $set: { document, version } },
        { new: true, useFindAndModify: false }
      );
      return { success: !!updated, currentRoom: updated ? updated.toObject() : undefined };
    } else {
      const room = fallbackMemoryDB.rooms[code];
      if (!room) return { success: false };
      room.document = document;
      room.version = version;
      fallbackMemoryDB.rooms[code] = room;
      saveFallbackDB();
      return { success: true, currentRoom: room };
    }
  },

  async addParticipant(roomCode, username, socketId) {
    if (!roomCode || typeof roomCode !== 'string') return null;
    const code = roomCode.trim().toUpperCase();
    const room = await this.getRoom(code);
    if (!room) return null;

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const existingIndex = room.participants.findIndex((p) => p.username.toLowerCase() === username.toLowerCase());

    if (existingIndex !== -1) {
      room.participants[existingIndex].id = socketId;
      room.participants[existingIndex].isActive = true;
    } else {
      const usedColors = room.participants.map((p) => p.color);
      const availableColors = colors.filter(c => !usedColors.includes(c));
      const chosenColor = availableColors.length > 0 ? availableColors[0] : colors[Math.floor(Math.random() * colors.length)];

      room.participants.push({
        id: socketId,
        username,
        isHost: false,
        isActive: true,
        color: chosenColor,
        cursorIndex: 0,
        isTyping: false
      });
    }

    room.history.push({
      id: Math.random().toString(36).substring(2, 9),
      username,
      action: `Joined the workspace.`,
      timestamp: new Date()
    });

    return await this.saveRoom(room);
  },

  async deactivateParticipant(socketId) {
    if (checkMongoState()) {
      const room = await MongoRoom.findOne({ 'participants.id': socketId });
      if (!room) return null;

      const pIdx = room.participants.findIndex((p) => p.id === socketId);
      if (pIdx !== -1) {
        const participant = room.participants[pIdx];
        participant.isActive = false;

        room.history.push({
          id: Math.random().toString(36).substring(2, 9),
          username: participant.username,
          action: `Left the room (disconnected).`,
          timestamp: new Date()
        });

        await room.save();
        return { roomCode: room.roomCode, username: participant.username, room: room.toObject() };
      }
    } else {
      for (const code of Object.keys(fallbackMemoryDB.rooms)) {
        const room = fallbackMemoryDB.rooms[code];
        const idx = room.participants.findIndex((p) => p.id === socketId);
        if (idx !== -1) {
          const participant = room.participants[idx];
          participant.isActive = false;

          room.history.push({
            id: Math.random().toString(36).substring(2, 9),
            username: participant.username,
            action: `Left the room (disconnected).`,
            timestamp: new Date()
          });

          fallbackMemoryDB.rooms[code] = room;
          saveFallbackDB();
          return { roomCode: code, username: participant.username, room };
        }
      }
    }
    return null;
  },

  async setRoomLock(roomCode, locked) {
    const room = await this.getRoom(roomCode);
    if (!room) return null;
    room.locked = locked;

    room.history.push({
      id: Math.random().toString(36).substring(2, 9),
      username: room.hostUsername,
      action: locked ? `Locked the room to new joins.` : `Unlocked the room.`,
      timestamp: new Date()
    });

    return await this.saveRoom(room);
  },

  async renameRoom(roomCode, newName) {
    const room = await this.getRoom(roomCode);
    if (!room) return null;
    const oldName = room.roomName;
    room.roomName = newName;

    room.history.push({
      id: Math.random().toString(36).substring(2, 9),
      username: room.hostUsername,
      action: `Renamed room from "${oldName}" to "${newName}".`,
      timestamp: new Date()
    });

    return await this.saveRoom(room);
  },

  async removeParticipant(roomCode, id) {
    const room = await this.getRoom(roomCode);
    if (!room) return null;

    const idx = room.participants.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const p = room.participants[idx];
      room.participants.splice(idx, 1);

      room.history.push({
        id: Math.random().toString(36).substring(2, 9),
        username: 'Host',
        action: `Removed participant ${p.username} from the room.`,
        timestamp: new Date()
      });

      return await this.saveRoom(room);
    }
    return null;
  },

  async logEditAction(roomCode, username, line) {
    const room = await this.getRoom(roomCode);
    if (!room) return;

    const lastLogs = room.history.slice(-3);
    const recentSpam = lastLogs.find((l) => 
      l.username === username && 
      l.action.includes('edited') && 
      (new Date().getTime() - new Date(l.timestamp).getTime() < 15000)
    );

    if (recentSpam) {
      recentSpam.action = `Edited code around line ${line}.`;
      recentSpam.timestamp = new Date();
    } else {
      room.history.push({
        id: Math.random().toString(36).substring(2, 9),
        username,
        action: `Edited code around line ${line}.`,
        timestamp: new Date()
      });
    }

    return await this.saveRoom(room);
  }
};
