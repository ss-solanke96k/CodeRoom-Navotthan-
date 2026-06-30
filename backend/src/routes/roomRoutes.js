import express from 'express';
import { createRoom, getRoomByCode } from '../controllers/roomController.js';

export const roomRouter = express.Router();

roomRouter.post('/', createRoom);
roomRouter.get('/:roomCode', getRoomByCode);
