import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { config } from './src/config/config.js';
import { connectMongoDB } from './src/config/database.js';
import { authRouter } from './src/routes/authRoutes.js';
import { roomRouter } from './src/routes/roomRoutes.js';
import { setupSocketService } from './src/services/socketService.js';

async function startServer() {
  const app = express();
  const PORT = config.PORT;

  app.use(express.json());

  // Establish database connections asynchronously (non-blocking lazy load)
  connectMongoDB().then(connected => {
    if (connected) {
      console.log('[Bootstrap] Persistent cloud database integration initialized successfully.');
    } else {
      console.log('[Bootstrap] Persistent fallback database integration online.');
    }
  });

  // --- API ROUTERS MOUNTING ---
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);

  // Create HTTP server
  const server = http.createServer(app);
  
  // Attach Socket.io server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Initialize modular socket event orchestration
  setupSocketService(io);

  // Mount Vite middleware in development (disable HMR as requested by AI Studio)
  if (config.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static asset server
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] CodeRoom Full-Stack application listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal bootstrap error:', err);
});
