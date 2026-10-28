const { v4: uuidv4 } = require('uuid');
const { Incident, Service, User } = require('../models');
const socketService = require('../services/socketService');
const { generatePostMortem } = require('../services/aiPostMortemService');

// Allowed State Machine transitions
const VALID_STATUS_TRANSITIONS = {
  TRIGGERED: ['ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'],
  ACKNOWLEDGED: ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'],
  INVESTIGATING: ['IDENTIFIED', 'MONITORING', 'RESOLVED', 'ACKNOWLEDGED'],
  IDENTIFIED: ['MONITORING', 'RESOLVED', 'INVESTIGATING'],
  MONITORING: ['RESOLVED', 'INVESTIGATING'],
  RESOLVED: ['INVESTIGATING', 'TRIGGERED'], // Reopen if regression occurs
};

exports.getIncidents = async (req, res) => {
  try {
    const { status, severity, serviceKey, search } = req.query;
    let query = {};

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        query.status = { $ne: 'RESOLVED' };
      } else {
        query.status = status;
      }
    }

    if (severity && severity !== 'ALL') {
      query.severity = severity;
    }

    if (serviceKey && serviceKey !== 'ALL') {
      query.serviceKey = serviceKey;
    }

    let incidentList = await Incident.find(query);
    let results = Array.isArray(incidentList) ? incidentList : incidentList.results || [];

    // Client-side or memory search filter
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      results = results.filter(
        (inc) =>
          (inc.title && inc.title.toLowerCase().includes(s)) ||
          (inc.incidentNumber && inc.incidentNumber.toLowerCase().includes(s)) ||
          (inc.serviceName && inc.serviceName.toLowerCase().includes(s)) ||
          (inc.summary && inc.summary.toLowerCase().includes(s))
      );
    }

    // Sort descending by creation date
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      count: results.length,
      incidents: results,
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve incidents.' });
  }
};

exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    let incident = null;

    if (id.startsWith('INC-')) {
      incident = await Incident.findOne({ incidentNumber: id.toUpperCase() });
    } else {
      incident = await Incident.findById(id);
    }

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    return res.json({
      success: true,
      incident,
    });
  } catch (error) {
    console.error('Error fetching incident details:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve incident details.' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    const { title, summary, severity, serviceId } = req.body;
    if (!title || !serviceId) {
      return res.status(400).json({ success: false, error: 'Title and service are required.' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Target service not found.' });
    }

    const all = await Incident.find({});
    const count = Array.isArray(all) ? all.length : (all.results && all.results.length) || 0;
    const incidentNumber = `INC-${1001 + count}`;
    const now = new Date();

    const authorName = req.user?.name || 'Engineer';
    const authorRole = req.user?.role || 'engineer';

    const newIncident = await Incident.create({
      incidentNumber,
      title,
      summary: summary || 'Manually declared incident by operations team.',
      severity: severity || 'P2 - High',
      status: 'TRIGGERED',
      serviceId: service._id,
      serviceName: service.name,
      serviceKey: service.key,
      source: 'manual',
      dedupKey: `${service.key}:manual:${uuidv4().substring(0, 8)}`,
      alertCount: 1,
      commanderName: 'Unassigned',
      timeline: [
        {
          id: uuidv4(),
          timestamp: now,
          type: 'status_change',
          actor: { id: req.user?._id || 'user', name: authorName, role: authorRole, isSystem: false },
          content: `Incident ${incidentNumber} manually declared by ${authorName}. Initial severity set to ${severity || 'P2 - High'}.`,
        },
      ],
      checklist: [
        { id: uuidv4(), title: 'Acknowledge incident and assign Incident Commander', completed: false },
        { id: uuidv4(), title: 'Verify service metrics and logs', completed: false },
        { id: uuidv4(), title: 'Identify faulty commit or resource bottleneck', completed: false },
        { id: uuidv4(), title: 'Apply mitigation and monitor recovery', completed: false },
      ],
      warRoomChat: [
        {
          id: uuidv4(),
          sender: { id: req.user?._id || 'user', name: authorName, role: authorRole, avatar: req.user?.avatar || '' },
          message: `Opened incident War Room for ${incidentNumber}. Responders please state presence.`,
          timestamp: now,
        },
      ],
      metrics: {
        triggeredAt: now,
        mttaSeconds: 0,
        mttrSeconds: 0,
      },
    });

    // Update service status
    if (severity === 'P1 - Critical') {
      service.status = 'major_outage';
    } else if (service.status === 'operational') {
      service.status = 'degraded';
    }
    service.activeIncidentsCount = (service.activeIncidentsCount || 0) + 1;
    await service.save();

    socketService.emitIncidentCreated(newIncident);
    socketService.emitServiceUpdated(service);

    return res.status(201).json({ success: true, incident: newIncident });
  } catch (error) {
    console.error('Error creating incident:', error);
    return res.status(500).json({ success: false, error: 'Failed to create incident.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const previousStatus = incident.status;
    if (previousStatus === status) {
      return res.json({ success: true, incident, message: 'Status unchanged.' });
    }

    // State machine check
    const allowed = VALID_STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition from ${previousStatus} to ${status}. Allowed: ${allowed.join(', ')}`,
      });
    }

    const now = new Date();
    incident.status = status;

    // MTTA calculation upon acknowledgement
    if (status === 'ACKNOWLEDGED' && !incident.metrics.acknowledgedAt) {
      incident.metrics.acknowledgedAt = now;
      const triggeredTime = new Date(incident.metrics.triggeredAt || incident.createdAt).getTime();
      incident.metrics.mttaSeconds = Math.max(1, Math.round((now.getTime() - triggeredTime) / 1000));
    }

    // MTTR calculation upon resolution
    if (status === 'RESOLVED') {
      incident.metrics.resolvedAt = now;
      const triggeredTime = new Date(incident.metrics.triggeredAt || incident.createdAt).getTime();
      incident.metrics.mttrSeconds = Math.max(1, Math.round((now.getTime() - triggeredTime) / 1000));

      // Restore service health if no other open incidents for this service
      const otherActive = await Incident.find({
        serviceKey: incident.serviceKey,
        _id: { $ne: incident._id },
        status: { $ne: 'RESOLVED' },
      });
      const activeCount = Array.isArray(otherActive) ? otherActive.length : otherActive.results?.length || 0;

      const service = await Service.findOne({ key: incident.serviceKey });
      if (service) {
        service.activeIncidentsCount = activeCount;
        if (activeCount === 0) {
          service.status = 'operational';
        }
        await service.save();
        socketService.emitServiceUpdated(service);
      }
    }

    // Record timeline audit event
    const authorName = req.user?.name || 'Engineer';
    const authorRole = req.user?.role || 'engineer';

    const timelineItem = {
      id: uuidv4(),
      timestamp: now,
      type: 'status_change',
      actor: { id: req.user?._id || 'user', name: authorName, role: authorRole, isSystem: false },
      content: `Status updated from ${previousStatus} → ${status}.${note ? ` Note: "${note}"` : ''}`,
      metadata: { previousStatus, newStatus: status, note },
    };

    incident.timeline.push(timelineItem);
    await incident.save();

    socketService.emitIncidentUpdated(incident);
    socketService.emitTimelineEvent(incident._id, timelineItem);

    return res.json({
      success: true,
      incident,
      message: `Incident status updated to ${status}.`,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update incident status.' });
  }
};

exports.assignRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body; // e.g. role: 'commander' | 'tech_lead' | 'responder'

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User to assign not found.' });
    }

    const now = new Date();
    if (role === 'commander') {
      incident.commanderId = targetUser._id;
      incident.commanderName = targetUser.name;
    }

    // Ensure responders array exists
    incident.responders = Array.isArray(incident.responders) ? incident.responders : [];

    // Check if user already in responders
    const existingIndex = incident.responders.findIndex((r) => String(r.userId) === String(targetUser._id));
    if (existingIndex !== -1) {
      incident.responders[existingIndex].role = role || 'Responder';
    } else {
      incident.responders.push({
        userId: targetUser._id,
        name: targetUser.name,
        role: role || 'Responder',
        joinedAt: now,
      });
    }

    const timelineItem = {
      id: uuidv4(),
      timestamp: now,
      type: 'role_assigned',
      actor: { id: req.user?._id || 'user', name: req.user?.name || 'Admin', role: req.user?.role || 'admin' },
      content: `${targetUser.name} assigned as ${role.toUpperCase()} by ${req.user?.name || 'Lead'}.`,
    };

    incident.timeline.push(timelineItem);
    await incident.save();

    socketService.emitIncidentUpdated(incident);
    socketService.emitTimelineEvent(incident._id, timelineItem);

    return res.json({ success: true, incident });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to assign role.' });
  }
};

exports.addTimelineNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content cannot be empty.' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const now = new Date();
    const timelineItem = {
      id: uuidv4(),
      timestamp: now,
      type: type || 'note',
      actor: {
        id: req.user?._id || 'user',
        name: req.user?.name || 'Engineer',
        role: req.user?.role || 'engineer',
        isSystem: false,
      },
      content: content.trim(),
    };

    incident.timeline.push(timelineItem);
    await incident.save();

    socketService.emitIncidentUpdated(incident);
    socketService.emitTimelineEvent(incident._id, timelineItem);

    return res.json({ success: true, timelineItem });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to add timeline note.' });
  }
};

exports.toggleChecklist = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const item = incident.checklist.find((c) => String(c.id) === String(itemId));
    if (!item) {
      return res.status(404).json({ success: false, error: 'Checklist item not found.' });
    }

    item.completed = !item.completed;
    item.completedBy = item.completed ? req.user?.name || 'Engineer' : '';
    item.completedAt = item.completed ? new Date() : null;

    await incident.save();
    socketService.emitChecklistUpdated(incident._id, incident.checklist);

    return res.json({ success: true, checklist: incident.checklist });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to toggle checklist item.' });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required.' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const newItem = {
      id: uuidv4(),
      title: title.trim(),
      completed: false,
    };

    incident.checklist.push(newItem);
    await incident.save();

    socketService.emitChecklistUpdated(incident._id, incident.checklist);
    return res.status(201).json({ success: true, checklist: incident.checklist });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to add checklist item.' });
  }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const chatMsg = {
      id: uuidv4(),
      sender: {
        id: req.user?._id || 'user',
        name: req.user?.name || 'Engineer',
        role: req.user?.role || 'engineer',
        avatar: req.user?.avatar || '',
      },
      message: message.trim(),
      timestamp: new Date(),
    };

    incident.warRoomChat.push(chatMsg);
    await incident.save();

    socketService.emitWarRoomMessage(incident._id, chatMsg);
    return res.json({ success: true, message: chatMsg });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to send chat message.' });
  }
};

exports.generatePostMortemReport = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const postMortemData = await generatePostMortem(incident);
    incident.postMortem = postMortemData;

    const timelineItem = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'ai_postmortem',
      actor: { id: 'ai', name: 'OpsFlow AI Engine', role: 'ai', isSystem: true },
      content: `Automated Post-Mortem and Root Cause Analysis generated for ${incident.incidentNumber}.`,
    };

    incident.timeline.push(timelineItem);
    await incident.save();

    socketService.emitIncidentUpdated(incident);
    socketService.emitTimelineEvent(incident._id, timelineItem);

    return res.json({
      success: true,
      postMortem: postMortemData,
      message: 'Post-Mortem successfully generated!',
    });
  } catch (error) {
    console.error('Post-mortem generation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate post-mortem.' });
  }
};
