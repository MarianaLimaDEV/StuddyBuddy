const mongoose = require('mongoose');

/** Shared task list (frontend calls /api/tasks without JWT). */
const taskSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Task', taskSchema);
