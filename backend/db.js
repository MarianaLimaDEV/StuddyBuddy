const mongoose = require('mongoose');
const path = require('path');

// In production/deploy you should provide env vars via the platform.
// Locally, we still try to load ../.env (best-effort).
try {
  if (process.env.NODE_ENV !== 'production') {
    // /backend/db.js -> ../.env
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  }
} catch (_) {
  // ignore (dotenv not available or file missing)
}

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getConnectOptions() {
  // Defaults tuned for small-to-medium deployments.
  const maxPoolSize = Number(process.env.MONGO_MAX_POOL_SIZE || 10);
  const minPoolSize = Number(process.env.MONGO_MIN_POOL_SIZE || 0);

  return {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    family: 4, // prefer IPv4 for fewer DNS surprises in some deploy environments
  };
}

function getRetryConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    retries: Number(process.env.MONGO_CONNECT_RETRIES || (isProd ? 10 : 3)),
    baseDelayMs: Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS || 500),
    maxDelayMs: Number(process.env.MONGO_CONNECT_RETRY_MAX_DELAY_MS || 5000),
  };
}

function setupMongooseDefaults() {
  // Reduce startup cost in production (indexes should be created via migrations / once).
  mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');
}

function attachConnectionLogs() {
  // Avoid duplicate listeners on hot reload
  if (mongoose.connection.__studdybuddy_listeners_attached) return;
  mongoose.connection.__studdybuddy_listeners_attached = true;

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err?.message || err);
  });
}

/**
 * Connect to MongoDB (singleton + retries).
 * Returns the mongoose connection.
 */
async function connectDB() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI/MONGODB_URI environment variable.');
  }

  setupMongooseDefaults();
  attachConnectionLogs();

  // Singleton across module reloads (useful in dev / some runtimes)
  const g = globalThis;
  if (!g.__studdybuddy_mongoose) g.__studdybuddy_mongoose = { conn: null, promise: null };
  const cached = g.__studdybuddy_mongoose;

  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  if (cached.promise) return cached.promise;

  const { retries, baseDelayMs, maxDelayMs } = getRetryConfig();
  const options = getConnectOptions();

  cached.promise = (async () => {
    let attempt = 0;
    // Mongoose will manage the underlying driver pool; we just ensure connect is stable.
    while (true) {
      attempt += 1;
      try {
        await mongoose.connect(MONGO_URI, options);
        cached.conn = mongoose.connection;
        return cached.conn;
      } catch (err) {
        cached.conn = null;
        const msg = err?.message || String(err);
        const isLast = attempt >= retries;
        console.error(`❌ MongoDB connect failed (attempt ${attempt}/${retries}):`, msg);
        if (isLast) throw err;

        const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
        const jitter = Math.round(Math.random() * 200);
        await sleep(backoff + jitter);
      }
    }
  })();

  try {
    return await cached.promise;
  } finally {
    // Let future calls create a new promise if needed (e.g. after disconnect)
    cached.promise = null;
  }
}

module.exports = connectDB;