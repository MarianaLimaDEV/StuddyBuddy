const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    done: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model('Task', taskSchema);

