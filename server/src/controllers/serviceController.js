const { Service, Incident } = require('../models');
const socketService = require('../services/socketService');

exports.getServices = async (req, res) => {
  try {
    const services = await Service.find({});
    let list = Array.isArray(services) ? services : services.results || [];

    // Recalculate active incidents dynamically
    const updatedList = await Promise.all(
      list.map(async (svc) => {
        const active = await Incident.find({ serviceKey: svc.key, status: { $ne: 'RESOLVED' } });
        const count = Array.isArray(active) ? active.length : active.results?.length || 0;
        return {
          ...svc,
          activeIncidentsCount: count,
        };
      })
    );

    return res.json({ success: true, services: updatedList });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch services.' });
  }
};

exports.getServiceByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const service = await Service.findOne({ key: key.toLowerCase().trim() });
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    const incidents = await Incident.find({ serviceKey: service.key });
    const incidentList = Array.isArray(incidents) ? incidents : incidents.results || [];

    return res.json({
      success: true,
      service,
      incidents: incidentList,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch service.' });
  }
};

exports.createService = async (req, res) => {
  try {
    const { name, key, description, tier, ownerTeam } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Service name is required.' });
    }

    const cleanKey = (key || name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const existing = await Service.findOne({ key: cleanKey });
    if (existing) {
      return res.status(400).json({ success: false, error: `Service key '${cleanKey}' is already in use.` });
    }

    const service = await Service.create({
      name,
      key: cleanKey,
      description: description || '',
      tier: tier || 'Tier 1 - Mission Critical',
      ownerTeam: ownerTeam || 'Platform Core',
      status: 'operational',
      uptime90d: 99.99,
      webhookSecret: 'whsec_' + Math.random().toString(36).substring(2, 14),
    });

    socketService.emitServiceUpdated(service);
    return res.status(201).json({ success: true, service });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create service.' });
  }
};

exports.updateServiceStatus = async (req, res) => {
  try {
    const { key } = req.params;
    const { status } = req.body;

    const service = await Service.findOne({ key: key.toLowerCase().trim() });
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    service.status = status;
    await service.save();

    socketService.emitServiceUpdated(service);
    return res.json({ success: true, service, message: `Status updated to ${status}.` });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update service status.' });
  }
};
