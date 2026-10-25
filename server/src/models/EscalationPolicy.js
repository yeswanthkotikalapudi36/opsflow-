const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
  },
  delayMinutes: {
    type: Number,
    default: 5,
  },
  targetType: {
    type: String,
    enum: ['user', 'on_call_primary', 'on_call_secondary', 'team_lead'],
    default: 'user',
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notifyChannel: {
    type: String,
    enum: ['sms', 'slack', 'email', 'push_notification', 'all'],
    default: 'all',
  },
});

const escalationPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  repeatTimes: {
    type: Number,
    default: 3,
  },
  rules: [ruleSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.EscalationPolicy || mongoose.model('EscalationPolicy', escalationPolicySchema);
