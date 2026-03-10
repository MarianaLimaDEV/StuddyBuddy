/**
 * StudySession model.
 * Aggregates minutes studied per day and type for a given user.
 */
const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    minutes: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    type: {
      type: String,
      enum: ['pomodoro', 'focus', 'manual'],
      default: 'pomodoro',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for efficient queries by user and date range
studySessionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);

