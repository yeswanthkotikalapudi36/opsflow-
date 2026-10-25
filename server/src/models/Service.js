const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  tier: {
    type: String,
    enum: ['Tier 1 - Mission Critical', 'Tier 2 - Business Critical', 'Tier 3 - Supporting'],
    default: 'Tier 1 - Mission Critical',
  },
  status: {
    type: String,
    enum: ['operational', 'degraded', 'partial_outage', 'major_outage'],
    default: 'operational',
  },
  uptime90d: {
    type: Number,
    default: 99.98,
  },
  ownerTeam: {
    type: String,
    default: 'Platform SRE',
  },
  webhookSecret: {
    type: String,
    default: () => 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
  },
  escalationPolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EscalationPolicy',
  },
  activeIncidentsCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema);
