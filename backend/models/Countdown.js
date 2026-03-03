const mongoose = require('mongoose');

const countdownSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    label: {
      type: String,
      default: 'Countdown',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for unique countdown per user
countdownSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Countdown', countdownSchema);

