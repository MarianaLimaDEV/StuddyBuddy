const mongoose = require('mongoose');

/**
 * One document = one completed study block (e.g. one Pomodoro work segment).
 * Synced per user via JWT (userId).
 */
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
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    type: {
      type: String,
      enum: ['pomodoro', 'focus', 'manual'],
      default: 'pomodoro',
    },
  },
  { timestamps: true, versionKey: false }
);

studySessionSchema.index({ userId: 1, createdAt: -1 });
studySessionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
