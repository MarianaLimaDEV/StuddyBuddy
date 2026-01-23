const mongoose = require('mongoose');

const countdownSchema = new mongoose.Schema(
  {
    targetDate: {
      type: Date,
      required: true,
    },
    // Futuramente podes ligar isto a um utilizador (userId)
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Countdown', countdownSchema);

