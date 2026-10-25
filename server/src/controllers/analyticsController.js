const { Incident, Service } = require('../models');

exports.getMetrics = async (req, res) => {
  try {
    const allIncidents = await Incident.find({});
    const incidents = Array.isArray(allIncidents) ? allIncidents : allIncidents.results || [];

    const allServices = await Service.find({});
    const services = Array.isArray(allServices) ? allServices : allServices.results || [];

    const totalIncidents = incidents.length;
    const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;
    const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED').length;

    // MTTA & MTTR calculations
    const acknowledgedWithMtta = incidents.filter((i) => i.metrics && i.metrics.mttaSeconds > 0);
    const resolvedWithMttr = incidents.filter((i) => i.metrics && i.metrics.mttrSeconds > 0);

    const avgMttaSeconds = acknowledgedWithMtta.length > 0
      ? Math.round(acknowledgedWithMtta.reduce((acc, curr) => acc + curr.metrics.mttaSeconds, 0) / acknowledgedWithMtta.length)
      : 180; // default 3 min

    const avgMttrSeconds = resolvedWithMttr.length > 0
      ? Math.round(resolvedWithMttr.reduce((acc, curr) => acc + curr.metrics.mttrSeconds, 0) / resolvedWithMttr.length)
      : 2520; // default 42 min

    // Severity distribution
    const severityCount = {
      'P1 - Critical': incidents.filter((i) => i.severity === 'P1 - Critical').length,
      'P2 - High': incidents.filter((i) => i.severity === 'P2 - High').length,
      'P3 - Medium': incidents.filter((i) => i.severity === 'P3 - Medium').length,
      'P4 - Low': incidents.filter((i) => i.severity === 'P4 - Low').length,
    };

    // Overall uptime
    const avgUptime = services.length > 0
      ? (services.reduce((acc, s) => acc + (s.uptime90d || 99.9), 0) / services.length).toFixed(3)
      : '99.980';

    // Status distribution
    const statusCount = {
      TRIGGERED: incidents.filter((i) => i.status === 'TRIGGERED').length,
      ACKNOWLEDGED: incidents.filter((i) => i.status === 'ACKNOWLEDGED').length,
      INVESTIGATING: incidents.filter((i) => i.status === 'INVESTIGATING').length,
      IDENTIFIED: incidents.filter((i) => i.status === 'IDENTIFIED').length,
      MONITORING: incidents.filter((i) => i.status === 'MONITORING').length,
      RESOLVED: resolvedIncidents,
    };

    return res.json({
      success: true,
      metrics: {
        totalIncidents,
        activeIncidents,
        resolvedIncidents,
        avgMttaSeconds,
        avgMttrSeconds,
        avgMttaFormatted: `${Math.round(avgMttaSeconds / 60)}m ${avgMttaSeconds % 60}s`,
        avgMttrFormatted: `${Math.round(avgMttrSeconds / 60)}m`,
        platformUptime: `${avgUptime}%`,
        severityCount,
        statusCount,
        servicesCount: services.length,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate analytics.' });
  }
};
