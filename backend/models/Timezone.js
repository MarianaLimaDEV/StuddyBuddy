const mongoose = require('mongoose');

const timezoneSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tz: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for unique timezones per user
timezoneSchema.index({ userId: 1, tz: { unique: true } });

module.exports = mongoose.model('Timezone', timezoneSchema);

