const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { optionalAuth } = require('../middleware/auth');

// Public webhook ingestion point for external monitoring tools
router.post('/ingest/:serviceKey', webhookController.ingestWebhook);

// Webhook audit logs
router.get('/logs', optionalAuth, webhookController.getWebhookLogs);

// Instant test trigger (for evaluator and UI experimentation)
router.post('/test-trigger', webhookController.testWebhook);

module.exports = router;
