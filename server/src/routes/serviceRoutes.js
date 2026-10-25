const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, serviceController.getServices);
router.get('/:key', optionalAuth, serviceController.getServiceByKey);
router.post('/', authMiddleware, serviceController.createService);
router.patch('/:key/status', authMiddleware, serviceController.updateServiceStatus);

module.exports = router;
