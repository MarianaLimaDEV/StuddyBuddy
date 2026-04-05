/**
 * MongoDB connection helper.
 * Loads ../.env in development (see README).
 */
const mongoose = require('mongoose');
const path = require('path');

try {
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  }
} catch (_) {}

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI (or MONGODB_URI) is not set. Add it to your .env file.');
    process.exit(1);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');
}

module.exports = connectDB;
