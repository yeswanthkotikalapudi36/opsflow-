const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  serviceKey: {
    type: String,
    required: true,
  },
  sourceType: {
    type: String,
    enum: ['prometheus', 'datadog', 'cloudwatch', 'grafana', 'pingdom', 'custom', 'curl_test'],
    default: 'custom',
  },
  headers: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['PROCESSED_NEW_INCIDENT', 'PROCESSED_DEDUPLICATED', 'FAILED_INVALID_KEY', 'FAILED_PAYLOAD_ERROR'],
    required: true,
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  incidentNumber: {
    type: String,
  },
  dedupKey: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.WebhookLog || mongoose.model('WebhookLog', webhookLogSchema);
