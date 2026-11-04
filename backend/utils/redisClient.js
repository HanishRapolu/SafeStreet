const { createClient } = require('redis');

let redisClient = null;

const isRedisEnabled = () => process.env.REDIS_ENABLED === 'true';

// Create Redis client singleton
const getRedisClient = async () => {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!redisClient) {
    // Create a new Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('⚠️ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    await redisClient.connect();
  }
  
  return redisClient;
};

// Cache data with expiry time
const cacheData = async (key, data, expiry = 3600) => {
  if (!isRedisEnabled()) {
    return false;
  }
  try {
    const client = await getRedisClient();
    if (!client) return false;
    await client.set(key, JSON.stringify(data), { EX: expiry });
    return true;
  } catch (error) {
    console.error(`❌ Redis caching error: ${error.message}`);
    return false;
  }
};

// Get cached data
const getCachedData = async (key) => {
  if (!isRedisEnabled()) {
    return null;
  }
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`❌ Redis fetch error: ${error.message}`);
    return null;
  }
};

// Delete cached data
const deleteCachedData = async (key) => {
  if (!isRedisEnabled()) {
    return false;
  }
  try {
    const client = await getRedisClient();
    if (!client) return false;
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`❌ Redis delete error: ${error.message}`);
    return false;
  }
};

// Clear all data with a pattern
const clearCachePattern = async (pattern) => {
  if (!isRedisEnabled()) {
    return false;
  }
  try {
    const client = await getRedisClient();
    if (!client) return false;
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Redis pattern delete error: ${error.message}`);
    return false;
  }
};

module.exports = {
  getRedisClient,
  cacheData,
  getCachedData,
  deleteCachedData,
  clearCachePattern
};
