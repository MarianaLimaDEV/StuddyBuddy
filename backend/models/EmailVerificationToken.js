const mongoose = require('mongoose');

// Email verification tokens (hashed) with TTL expiration.
// Store only a SHA-256 hash of the token (never the raw token).
const emailVerificationTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestedIp: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// TTL index: MongoDB will delete docs when expiresAt < now
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);

