import { dbService } from './dbService.js';
import { cacheService } from '../config/database.js';

// Recent deltas cache for OT-Lite conflict transform
// Key: roomCode (uppercase), Value: Array of recent deltas applied
const recentDeltas = new Map();

// Helper to add delta to cache (keep last 100)
function recordDelta(roomCode, delta, targetVersion) {
  const code = roomCode.toUpperCase();
  if (!recentDeltas.has(code)) {
    recentDeltas.set(code, []);
  }
  const history = recentDeltas.get(code);
  history.push({ delta, targetVersion });
  if (history.length > 100) {
    history.shift();
  }
}

/**
 * Attaches real-time collaborative workspace handlers to the Socket.io server instance.
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
export function setupSocketService(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // --- 1. JOIN WORKSPACE ROOM ---
    socket.on('join-room', async ({ roomCode, username }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);

        if (!room) {
          socket.emit('error-msg', 'Room not found.');
          return;
        }

        if (room.locked && !room.participants.some((p) => p.username.toLowerCase() === username.toLowerCase())) {
          socket.emit('error-msg', 'This room is currently locked by the host.');
          return;
        }

        // Check if this is the pending host socket
        if (room.hostUsername === username && room.hostSocketId === 'host-pending') {
          room.hostSocketId = socket.id;
          const hostParticipant = room.participants.find((p) => p.isHost);
          if (hostParticipant) {
            hostParticipant.id = socket.id;
          }
          await dbService.saveRoom(room);
        }

        // Join the socket room
        socket.join(code);

        // Add participant to persistent storage
        const updatedRoom = await dbService.addParticipant(code, username, socket.id);
        if (!updatedRoom) {
          socket.emit('error-msg', 'Failed to join room context.');
          return;
        }

        const self = updatedRoom.participants.find((p) => p.id === socket.id);

        console.log(`[Socket] User ${username} (${socket.id}) joined room ${code}`);

        // Send initial synchronization state
        socket.emit('room-state', {
          room: updatedRoom,
          yourId: socket.id,
          yourColor: self?.color || '#3b82f6'
        });

        // Broadcast updated participant list and logs to everyone in the room
        io.to(code).emit('participants-updated', updatedRoom.participants);
        io.to(code).emit('logs-updated', updatedRoom.history);
      } catch (err) {
        console.error('[Socket join-room] Fatal error:', err);
        socket.emit('error-msg', 'Failed to join collaborative workspace session.');
      }
    });

    // --- 2. DELTA-BASED REAL-TIME SYNCHRONIZATION WITH OT-LITE POSITION-TRANSFORM ---
    socket.on('send-delta', async ({ roomCode, delta }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        const currentDoc = room.document;
        const serverVersion = room.version;
        const clientVersion = delta.version;

        let appliedIndex = delta.index;

        // CONFLICT STRATEGY CHECK:
        // If client version matches current server version, we apply the delta directly.
        // If client version is outdated, we apply operational transformation position shifting!
        if (clientVersion < serverVersion) {
          console.log(`[Conflict Engine] Client version (${clientVersion}) is older than Server version (${serverVersion}). Transforming delta...`);
          const history = recentDeltas.get(code) || [];
          
          // Filter history for deltas that occurred AFTER the client's base version
          const conflictingEdits = history.filter(h => h.targetVersion > clientVersion);

          for (const config of conflictingEdits) {
            const prevDelta = config.delta;
            
            // Position transform logic:
            // If a previous edit happened BEFORE our current insertion/deletion index, we must shift our index!
            if (prevDelta.index <= appliedIndex) {
              // Net length change introduced by the previous conflicting edit
              const shiftAmount = prevDelta.text.length - prevDelta.removedLength;
              
              // Adjust the index so the edit lands where the user originally intended
              appliedIndex += shiftAmount;
              
              // Make sure index never goes negative
              if (appliedIndex < 0) appliedIndex = 0;
            }
          }
          console.log(`[Conflict Engine] Shifted index from ${delta.index} to ${appliedIndex} for author: ${delta.author}`);
        }

        // Guard check to ensure transformed index is within bounds
        if (appliedIndex < 0) appliedIndex = 0;
        if (appliedIndex > currentDoc.length) appliedIndex = currentDoc.length;

        // Apply delta to server's document state
        const textBefore = currentDoc.substring(0, appliedIndex);
        const textAfter = currentDoc.substring(appliedIndex + delta.removedLength);
        const updatedDoc = textBefore + delta.text + textAfter;

        const nextVersion = serverVersion + 1;

        // Save document updates persistently
        const saved = await dbService.updateRoomDocument(code, updatedDoc, nextVersion);

        if (saved.success && saved.currentRoom) {
          // Record applied delta in history
          delta.version = nextVersion; // Base client version gets stamped with new server version code
          recordDelta(code, delta, nextVersion);

          // Update version cache for rapid reading
          await cacheService.set(`room:${code}:version`, nextVersion.toString());

          // Broadcast delta changes to other connected sockets inside the room
          socket.to(code).emit('receive-delta', {
            delta,
            updatedVersion: nextVersion
          });

          // Async log writing to avoid blocking thread
          dbService.logEditAction(code, delta.author, delta.index).then(updatedRoom => {
            if (updatedRoom) {
              io.to(code).emit('logs-updated', updatedRoom.history);
            }
          }).catch(err => {
            console.error('[Socket logEditAction] Error:', err);
          });
        }
      } catch (err) {
        console.error('[Socket send-delta] Error:', err);
      }
    });

    // --- 3. CURSOR MOVEMENT SYNCHRONIZATION ---
    socket.on('cursor-move', async ({ roomCode, cursorIndex }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        const participant = room.participants.find((p) => p.id === socket.id);
        if (participant) {
          participant.cursorIndex = cursorIndex;
          await dbService.saveRoom(room);
          socket.to(code).emit('cursor-updated', {
            userId: socket.id,
            username: participant.username,
            cursorIndex,
            color: participant.color
          });
        }
      } catch (err) {
        console.error('[Socket cursor-move] Error:', err);
      }
    });

    // --- 4. TYPING STATE CHANGES ---
    socket.on('typing-status', async ({ roomCode, isTyping }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        const participant = room.participants.find((p) => p.id === socket.id);
        if (participant) {
          participant.isTyping = isTyping;
          await dbService.saveRoom(room);
          socket.to(code).emit('typing-updated', {
            userId: socket.id,
            username: participant.username,
            isTyping
          });
        }
      } catch (err) {
        console.error('[Socket typing-status] Error:', err);
      }
    });

    // --- 5. HOST ACTIONS: RENAME ROOM ---
    socket.on('host-rename-room', async ({ roomCode, newName }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        // Verify host privileges
        if (room.hostSocketId !== socket.id) {
          socket.emit('error-msg', 'Only the host has privilege to rename the room.');
          return;
        }

        const updated = await dbService.renameRoom(code, newName);
        if (updated) {
          io.to(code).emit('room-details-updated', {
            roomName: updated.roomName,
            locked: updated.locked
          });
          io.to(code).emit('logs-updated', updated.history);
        }
      } catch (err) {
        console.error('[Socket host-rename-room] Error:', err);
        socket.emit('error-msg', 'Failed to rename room.');
      }
    });

    // --- 6. HOST ACTIONS: LOCK ROOM ---
    socket.on('host-lock-room', async ({ roomCode, locked }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        if (room.hostSocketId !== socket.id) {
          socket.emit('error-msg', 'Only the host has privilege to lock/unlock the room.');
          return;
        }

        const updated = await dbService.setRoomLock(code, locked);
        if (updated) {
          io.to(code).emit('room-details-updated', {
            roomName: updated.roomName,
            locked: updated.locked
          });
          io.to(code).emit('logs-updated', updated.history);
        }
      } catch (err) {
        console.error('[Socket host-lock-room] Error:', err);
        socket.emit('error-msg', 'Failed to lock/unlock room.');
      }
    });

    // --- 7. HOST ACTIONS: CLEAR EDITOR ---
    socket.on('host-clear-editor', async ({ roomCode }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        if (room.hostSocketId !== socket.id) {
          socket.emit('error-msg', 'Only the host has privilege to clear the editor.');
          return;
        }

        const nextVersion = room.version + 1;
        const updated = await dbService.updateRoomDocument(code, '', nextVersion);
        if (updated.success && updated.currentRoom) {
          // Record and broadcast delta for clear action
          const clearDelta = {
            index: 0,
            text: '',
            removedLength: room.document.length,
            author: room.hostUsername,
            version: nextVersion
          };
          recordDelta(code, clearDelta, nextVersion);

          // Update redis version tracking for this room
          await cacheService.set(`room:${code}:version`, nextVersion.toString());

          io.to(code).emit('receive-delta', {
            delta: clearDelta,
            updatedVersion: nextVersion,
            forceOverwrite: true // Instruct clients to completely reset state
          });
        }
      } catch (err) {
        console.error('[Socket host-clear-editor] Error:', err);
        socket.emit('error-msg', 'Failed to clear editor.');
      }
    });

    // --- 8. HOST ACTIONS: KICK PARTICIPANT ---
    socket.on('host-kick-participant', async ({ roomCode, targetSocketId }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await dbService.getRoom(code);
        if (!room) return;

        if (room.hostSocketId !== socket.id) {
          socket.emit('error-msg', 'Only the host has privilege to kick participants.');
          return;
        }

        const target = room.participants.find((p) => p.id === targetSocketId);
        if (!target) return;

        const updated = await dbService.removeParticipant(code, targetSocketId);
        if (updated) {
          io.to(code).emit('participants-updated', updated.participants);
          io.to(code).emit('logs-updated', updated.history);
          // Direct kick signal to target socket
          io.to(targetSocketId).emit('kicked-signal');
        }
      } catch (err) {
        console.error('[Socket host-kick-participant] Error:', err);
        socket.emit('error-msg', 'Failed to kick participant.');
      }
    });

    // --- 9. CLIENT DISCONNECTION ---
    socket.on('disconnect', async () => {
      try {
        console.log(`[Socket] Disconnected: ${socket.id}`);
        const info = await dbService.deactivateParticipant(socket.id);
        if (info) {
          const { roomCode, room } = info;
          io.to(roomCode).emit('participants-updated', room.participants);
          io.to(roomCode).emit('logs-updated', room.history);
        }
      } catch (err) {
        console.error('[Socket disconnect] Error:', err);
      }
    });
  });
}
