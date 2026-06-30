import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

// Load environmental variables from .env file
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'coderoom_super_secure_production_secret_key_123',
  MONGODB_URI: process.env.MONGODB_URI || '',
  REDIS_URL: process.env.REDIS_URL || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  BACKUP_DB_FILE: path.join(os.tmpdir(), 'production_fallback_db.json'),
  COLORS: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
};
