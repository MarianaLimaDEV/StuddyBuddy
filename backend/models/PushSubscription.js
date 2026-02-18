const mongoose = require('mongoose');

// Stores Web Push subscriptions (VAPID). Endpoint is unique per browser profile/device.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true, index: true },
    subscription: { type: Object, required: true }, // full PushSubscription JSON (keys, endpoint, etc.)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save hook to synchronize top-level endpoint with subscription.endpoint
pushSubscriptionSchema.pre('save', function(next) {
  // If subscription exists and has an endpoint, ensure top-level endpoint matches
  if (this.subscription && this.subscription.endpoint) {
    // If top-level endpoint is different, update it
    if (this.endpoint !== this.subscription.endpoint) {
      this.endpoint = this.subscription.endpoint;
    }
    // Validate that subscription.endpoint exists
    if (!this.subscription.endpoint) {
      return next(new Error('subscription.endpoint is required'));
    }
  } else if (!this.endpoint) {
    return next(new Error('Either endpoint or subscription.endpoint is required'));
  }
  next();
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);

