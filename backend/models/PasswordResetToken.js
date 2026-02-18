const mongoose = require('mongoose');

// Password reset tokens (hashed) with TTL expiration.
// We store only a SHA-256 hash of the token (never the raw token).
const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
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
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

