const { WebhookLog, Service } = require('../models');
const { processAlertWebhook } = require('../services/dedupEngine');

exports.ingestWebhook = async (req, res) => {
  try {
    const { serviceKey } = req.params;
    const service = await Service.findOne({ key: serviceKey.toLowerCase().trim() });
    if (!service) {
      return res.status(404).json({
        success: false,
        error: `Service '${serviceKey}' not found. Verify the service key in OpsFlow catalog.`,
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = await processAlertWebhook(service, req.body, req.headers, ip);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Webhook ingestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing webhook alert.',
      details: error.message,
    });
  }
};

exports.getWebhookLogs = async (req, res) => {
  try {
    const { serviceKey } = req.query;
    let query = {};
    if (serviceKey && serviceKey !== 'ALL') {
      query.serviceKey = serviceKey;
    }

    const logs = await WebhookLog.find(query);
    const list = Array.isArray(logs) ? logs : logs.results || [];
    list.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return res.json({
      success: true,
      count: list.length,
      logs: list.slice(0, 50),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch webhook logs.' });
  }
};

exports.testWebhook = async (req, res) => {
  try {
    const { serviceKey, alertType, severity, message } = req.body;
    const targetKey = (serviceKey || 'auth-service').toLowerCase();

    let service = await Service.findOne({ key: targetKey });
    if (!service) {
      const allSvc = await Service.find({});
      const list = Array.isArray(allSvc) ? allSvc : allSvc.results || [];
      service = list[0];
    }

    if (!service) {
      return res.status(404).json({ success: false, error: 'No services available to test.' });
    }

    const simulatedPayload = {
      alerts: [
        {
          labels: {
            alertname: alertType || 'HighErrorRateDetected',
            instance: 'prod-k8s-pod-7c89',
            severity: severity || 'critical',
          },
          annotations: {
            summary: message || 'HTTP 5xx rate exceeded 15% threshold for 2 minutes on /v1/auth',
            description: 'Immediate investigation required. Cluster health degraded.',
          },
        },
      ],
    };

    const result = await processAlertWebhook(service, simulatedPayload, { 'user-agent': 'OpsFlow-UI-Test/1.0' }, '127.0.0.1');

    return res.json({
      success: true,
      serviceName: service.name,
      ...result,
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return res.status(500).json({ success: false, error: 'Failed to trigger test webhook.' });
  }
};
