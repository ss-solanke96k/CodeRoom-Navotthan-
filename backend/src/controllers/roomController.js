import { dbService } from '../services/dbService.js';
import { cacheService } from '../config/database.js';

export const createRoom = async (req, res) => {
  try {
    const { roomName, hostUsername } = req.body;
    if (!roomName || !hostUsername) {
      return res.status(400).json({ error: 'Room name and Host username are required.' });
    }

    // Generate a unique 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = await dbService.createRoom(roomCode, roomName, hostUsername, 'host-pending');

    // Cache document initial version for lightning fast checks
    await cacheService.set(`room:${roomCode}:version`, '1');

    res.status(201).json({ room });
  } catch (error) {
    console.error('[API Create Room] Error:', error);
    res.status(500).json({ error: 'Failed to create room.' });
  }
};

export const getRoomByCode = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await dbService.getRoom(roomCode);
    if (!room) {
      return res.status(404).json({ error: `Room ${roomCode} does not exist.` });
    }
    res.json({
      roomCode: room.roomCode,
      roomName: room.roomName,
      locked: room.locked,
      hostUsername: room.hostUsername,
      participantsCount: room.participants.filter((p) => p.isActive).length
    });
  } catch (err) {
    console.error('[API Get Room] Error:', err);
    res.status(500).json({ error: 'Internal system error searching for room.' });
  }
};
