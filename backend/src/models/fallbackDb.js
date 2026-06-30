import fs from 'fs';
import { config } from '../config/config.js';

let fallbackMemoryDB = { users: [], rooms: {} };

// Attempt to load existing local fallback data from disk backup on bootstrap
try {
  if (fs.existsSync(config.BACKUP_DB_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(config.BACKUP_DB_FILE, 'utf-8'));
    if (loaded && typeof loaded === 'object') {
      fallbackMemoryDB = loaded;
    }
  }
  
  // Guarantee integrity of basic collections
  if (!fallbackMemoryDB.rooms || typeof fallbackMemoryDB.rooms !== 'object') {
    fallbackMemoryDB.rooms = {};
  }
  if (!Array.isArray(fallbackMemoryDB.users)) {
    fallbackMemoryDB.users = [];
  }
  
  // Force write structured backup back to target path
  fs.writeFileSync(config.BACKUP_DB_FILE, JSON.stringify(fallbackMemoryDB, null, 2));
} catch (e) {
  console.warn('[DB Fallback] Failed to load disk backup, keeping active memory cache.', e);
  fallbackMemoryDB = { users: [], rooms: {} };
}

/**
 * Saves current in-memory database fallback to the local disk backup file.
 */
export function saveFallbackDB() {
  try {
    fs.writeFileSync(config.BACKUP_DB_FILE, JSON.stringify(fallbackMemoryDB, null, 2));
  } catch (e) {
    console.error('[DB Fallback] Disk write failure:', e);
  }
}

export { fallbackMemoryDB };
