import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  throw new Error('Please define REDIS_URL and REDIS_TOKEN environment variables');
}

// Upstash Redis configuration - construct proper Redis URL
const redisUrl = REDIS_URL.startsWith('rediss://')
  ? REDIS_URL
  : `rediss://default:${REDIS_TOKEN}@${REDIS_URL.replace('https://', '')}`;

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: {
    // Enable TLS for Upstash secure connection
    rejectUnauthorized: false,
  },
});

redis.on('error', (err) => {
  console.error('Upstash Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Upstash Redis Client Connected');
});

export default redis;
