const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const incidentRoutes = require('./incidentRoutes');
const serviceRoutes = require('./serviceRoutes');
const webhookRoutes = require('./webhookRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const { getDbStatus } = require('../db');

router.use('/auth', authRoutes);
router.use('/incidents', incidentRoutes);
router.use('/services', serviceRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/analytics', analyticsRoutes);

// Health check endpoint with database mode inspection
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'OpsFlow Core Reliability API',
    version: '1.0.0',
    db: getDbStatus(),
  });
});

module.exports = router;
