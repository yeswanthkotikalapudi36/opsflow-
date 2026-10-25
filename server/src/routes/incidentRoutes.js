const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Public or optionally authenticated to support public status page and internal app
router.get('/', optionalAuth, incidentController.getIncidents);
router.get('/:id', optionalAuth, incidentController.getIncidentById);

// Authenticated incident operations
router.post('/', authMiddleware, incidentController.createIncident);
router.patch('/:id/status', authMiddleware, incidentController.updateStatus);
router.patch('/:id/assign', authMiddleware, incidentController.assignRole);
router.post('/:id/timeline', authMiddleware, incidentController.addTimelineNote);
router.post('/:id/checklist', authMiddleware, incidentController.addChecklistItem);
router.patch('/:id/checklist/:itemId', authMiddleware, incidentController.toggleChecklist);
router.post('/:id/chat', authMiddleware, incidentController.sendChatMessage);
router.post('/:id/post-mortem', authMiddleware, incidentController.generatePostMortemReport);

module.exports = router;
