import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from './config.js';

let isMongoConnected = false;
let redisClient = null;
let useRedisFallback = true;
const memoryRedisCache = new Map();

/**
 * Initializes and connects asynchronously to the remote MongoDB database cluster.
 */
export async function connectMongoDB() {
  const uri = config.MONGODB_URI;
  if (!uri) {
    console.warn('[MongoDB] No MONGODB_URI configured. Running on high-fidelity local memory database.');
    return false;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
      });
      isMongoConnected = true;
      console.log('[MongoDB] Connected successfully to remote database cluster.');
      return true;
    }
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.log('[MongoDB] Running in offline fallback mode. Local persistent storage is active and fully functional.');
    isMongoConnected = false;
    return false;
  }
}

/**
 * Lazy loads and returns the configured Redis instance.
 */
export function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = config.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL configured. Caching is operating inside hot memory storage.');
    useRedisFallback = true;
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      retryStrategy(times) {
        if (times > 3) {
          console.error('[Redis] Connection limit exceeded. Switching dynamically to in-memory caching engine.');
          useRedisFallback = true;
          return null; // Stop trying and fallback
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Remote cluster caching connected and optimized.');
      useRedisFallback = false;
    });

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection error. Operating with in-memory fallback state.', err.message);
      useRedisFallback = true;
    });

    return redisClient;
  } catch (err) {
    console.error('[Redis] Failed to initialize Redis driver. Falling back to hot state cache.', err);
    useRedisFallback = true;
    return null;
  }
}

/**
 * Transparent universal cache manager (either Redis or hot state Map)
 */
export const cacheService = {
  async set(key, value, expireSeconds) {
    const client = getRedisClient();
    if (client && !useRedisFallback) {
      try {
        if (expireSeconds) {
          await client.set(key, value, 'EX', expireSeconds);
        } else {
          await client.set(key, value);
        }
        return;
      } catch (err) {
        console.warn('[Cache Service] Redis SET failed, writing to local memory:', err.message);
      }
    }
    memoryRedisCache.set(key, value);
  },

  async get(key) {
    const client = getRedisClient();
    if (client && !useRedisFallback) {
      try {
        const val = await client.get(key);
        if (val !== null) return val;
      } catch (err) {
        console.warn('[Cache Service] Redis GET failed, reading from memory:', err.message);
      }
    }
    return memoryRedisCache.get(key) || null;
  },

  async del(key) {
    const client = getRedisClient();
    if (client && !useRedisFallback) {
      try {
        await client.del(key);
        return;
      } catch (err) {
        console.warn('[Cache Service] Redis DEL failed, purging local memory:', err.message);
      }
    }
    memoryRedisCache.delete(key);
  }
};

/**
 * Helper to check connection status of Mongo client.
 */
export function checkMongoState() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}
