const mongoose = require('mongoose');

const timelineItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['status_change', 'alert_ingest', 'escalation', 'note', 'action_item', 'ai_postmortem', 'role_assigned'],
    default: 'note',
  },
  actor: {
    id: { type: String, default: 'system' },
    name: { type: String, default: 'OpsFlow System' },
    role: { type: String, default: 'system' },
    isSystem: { type: Boolean, default: false },
  },
  content: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const checklistItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedBy: {
    type: String,
    default: '',
  },
  completedAt: {
    type: Date,
  },
});

const warRoomMessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  sender: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'engineer' },
    avatar: { type: String, default: '' },
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const incidentSchema = new mongoose.Schema({
  incidentNumber: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  summary: {
    type: String,
    default: '',
  },
  severity: {
    type: String,
    enum: ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'],
    default: 'P2 - High',
  },
  status: {
    type: String,
    enum: ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'],
    default: 'TRIGGERED',
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
  },
  serviceName: {
    type: String,
    default: 'Core Platform',
  },
  serviceKey: {
    type: String,
    default: 'core-platform',
  },
  source: {
    type: String,
    default: 'manual',
  },
  dedupKey: {
    type: String,
    index: true,
  },
  alertCount: {
    type: Number,
    default: 1,
  },
  commanderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  commanderName: {
    type: String,
    default: 'Unassigned',
  },
  responders: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      role: { type: String, default: 'Responder' },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  escalationLevel: {
    type: Number,
    default: 1,
  },
  timeline: [timelineItemSchema],
  checklist: [checklistItemSchema],
  warRoomChat: [warRoomMessageSchema],
  metrics: {
    triggeredAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    mttaSeconds: { type: Number, default: 0 },
    mttrSeconds: { type: Number, default: 0 },
  },
  postMortem: {
    generatedAt: { type: Date },
    executiveSummary: { type: String, default: '' },
    rootCause: { type: String, default: '' },
    impactAnalysis: { type: String, default: '' },
    contributingFactors: [{ type: String }],
    preventativeActions: [{ type: String }],
    markdown: { type: String, default: '' },
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

module.exports = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
