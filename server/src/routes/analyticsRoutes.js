const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { optionalAuth } = require('../middleware/auth');

router.get('/metrics', optionalAuth, analyticsController.getMetrics);

module.exports = router;
