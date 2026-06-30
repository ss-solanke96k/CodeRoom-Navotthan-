import express from 'express';
import jwt from 'jsonwebtoken';
import { register, login, getMe } from '../controllers/authController.js';
import { config } from '../config/config.js';

export const authRouter = express.Router();

// Authentication Guard Middleware for stateless requests
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing. Please sign in.' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please authenticate again.' });
    }
    req.user = decoded;
    next();
  });
}

// Map routers to controllers
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticateToken, getMe);
