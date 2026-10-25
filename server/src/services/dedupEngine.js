const { v4: uuidv4 } = require('uuid');
const { Incident, Service, WebhookLog } = require('../models');
const socketService = require('./socketService');

// Normalize incoming payloads from various monitoring systems
function normalizePayload(service, body = {}, headers = {}) {
  let alertName = 'Generic Alert';
  let summary = 'Anomalous metric threshold exceeded';
  let severity = 'P2 - High';
  let resource = 'default-host';
  let sourceType = 'custom';

  // 1. Prometheus Alertmanager
  if (body.alerts && Array.isArray(body.alerts) && body.alerts.length > 0) {
    sourceType = 'prometheus';
    const alert = body.alerts[0];
    alertName = alert.labels?.alertname || alert.labels?.job || 'PrometheusAlert';
    summary = alert.annotations?.summary || alert.annotations?.description || 'Prometheus threshold fired';
    resource = alert.labels?.instance || alert.labels?.pod || alert.labels?.node || 'cluster-node';
    const rawSev = (alert.labels?.severity || '').toLowerCase();
    if (rawSev.includes('crit') || rawSev.includes('page')) severity = 'P1 - Critical';
    else if (rawSev.includes('warn')) severity = 'P2 - High';
    else severity = 'P3 - Medium';
  }
  // 2. Datadog Webhook
  else if (body.event_type || body.alert_type) {
    sourceType = 'datadog';
    alertName = body.title || 'Datadog Monitor Triggered';
    summary = body.body || body.text || 'Datadog monitor alert';
    resource = body.hostname || body.tags?.join(',') || 'datadog-host';
    const rawSev = (body.alert_type || body.priority || '').toLowerCase();
    if (rawSev.includes('error') || rawSev.includes('p1')) severity = 'P1 - Critical';
    else if (rawSev.includes('warn') || rawSev.includes('p2')) severity = 'P2 - High';
    else severity = 'P3 - Medium';
  }
  // 3. AWS CloudWatch
  else if (body.AlarmName || body.NewStateValue) {
    sourceType = 'cloudwatch';
    alertName = body.AlarmName || 'CloudWatch Alarm';
    summary = body.AlarmDescription || body.NewStateReason || 'AWS CloudWatch state change';
    resource = body.Region || 'aws-cloud';
    if (body.NewStateValue === 'ALARM') severity = 'P1 - Critical';
    else severity = 'P3 - Medium';
  }
  // 4. Pingdom / Uptime
  else if (body.check_name || body.checkname) {
    sourceType = 'pingdom';
    alertName = `Uptime Check Failed: ${body.check_name || body.checkname}`;
    summary = body.description || `Health check failed with response time: ${body.response_time || 'timeout'}ms`;
    resource = body.host || service.key;
    severity = 'P1 - Critical';
  }
  // 5. Generic / Custom Payload
  else {
    sourceType = headers['user-agent']?.includes('curl') ? 'curl_test' : 'custom';
    alertName = body.title || body.alertName || body.name || `Health Alert for ${service.name}`;
    summary = body.summary || body.description || body.message || 'Automated health alert detected';
    resource = body.host || body.resource || body.endpoint || 'api-gateway';
    if (body.severity) {
      const s = String(body.severity).toUpperCase();
      if (s.includes('P1') || s.includes('CRITICAL')) severity = 'P1 - Critical';
      else if (s.includes('P2') || s.includes('HIGH')) severity = 'P2 - High';
      else if (s.includes('P3') || s.includes('MEDIUM')) severity = 'P3 - Medium';
      else severity = 'P4 - Low';
    }
  }

  // Generate deterministic deduplication fingerprint
  const cleanAlert = alertName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cleanRes = resource.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const dedupKey = `${service.key}:${cleanAlert}:${cleanRes}`;

  return {
    sourceType,
    alertName,
    summary,
    severity,
    resource,
    dedupKey,
  };
}

// Generate default checklist items for new incidents based on severity
function getDefaultChecklist(severity) {
  const common = [
    { id: uuidv4(), title: 'Acknowledge incident and assign Incident Commander', completed: false },
    { id: uuidv4(), title: 'Inspect recent deployment logs & commits in CI/CD', completed: false },
    { id: uuidv4(), title: 'Verify metrics in Grafana / Datadog telemetry dashboards', completed: false },
  ];

  if (severity === 'P1 - Critical') {
    return [
      ...common,
      { id: uuidv4(), title: 'Post initial customer notice to Public Status Page', completed: false },
      { id: uuidv4(), title: 'Prepare traffic divert / blue-green rollback procedure', completed: false },
      { id: uuidv4(), title: 'Open War Room bridge and notify executive stakeholders', completed: false },
    ];
  }

  return [
    ...common,
    { id: uuidv4(), title: 'Apply hotfix or restart degraded pods / instances', completed: false },
    { id: uuidv4(), title: 'Confirm error rates have normalized below SLA threshold', completed: false },
  ];
}

async function processAlertWebhook(service, payload = {}, headers = {}, ip = '127.0.0.1') {
  const normalized = normalizePayload(service, payload, headers);
  const now = new Date();

  // Search for active incident matching this deduplication key
  const activeIncidents = await Incident.find({
    serviceKey: service.key,
    dedupKey: normalized.dedupKey,
    status: { $ne: 'RESOLVED' },
  });

  const existingIncident = Array.isArray(activeIncidents)
    ? activeIncidents[0]
    : (activeIncidents.results && activeIncidents.results[0]) || null;

  // CASE 1: DEDUPLICATION COLLAPSE
  if (existingIncident) {
    const updatedCount = (existingIncident.alertCount || 1) + 1;

    const timelineItem = {
      id: uuidv4(),
      timestamp: now,
      type: 'alert_ingest',
      actor: {
        id: 'system',
        name: 'OpsFlow Deduplication Engine',
        role: 'system',
        isSystem: true,
      },
      content: `Deduplicated alert #${updatedCount} suppressed: identical fingerprint [${normalized.dedupKey}]. Triggered by ${normalized.sourceType}.`,
      metadata: {
        sourceType: normalized.sourceType,
        alertName: normalized.alertName,
        resource: normalized.resource,
        alertCount: updatedCount,
      },
    };

    existingIncident.alertCount = updatedCount;
    existingIncident.timeline.push(timelineItem);
    await existingIncident.save();

    // Log webhook execution
    await WebhookLog.create({
      serviceKey: service.key,
      sourceType: normalized.sourceType,
      headers,
      payload,
      status: 'PROCESSED_DEDUPLICATED',
      incidentId: existingIncident._id,
      incidentNumber: existingIncident.incidentNumber,
      dedupKey: normalized.dedupKey,
      ipAddress: ip,
    });

    // Notify live sockets
    socketService.emitIncidentUpdated(existingIncident);
    socketService.emitTimelineEvent(existingIncident._id, timelineItem);

    return {
      status: 'DEDUPLICATED',
      message: `Alert deduplicated. Collapsed into active incident ${existingIncident.incidentNumber}.`,
      incidentNumber: existingIncident.incidentNumber,
      alertCount: updatedCount,
      dedupKey: normalized.dedupKey,
    };
  }

  // CASE 2: NEW INCIDENT CREATION
  // Determine next incident number
  const allIncidents = await Incident.find({});
  const count = Array.isArray(allIncidents)
    ? allIncidents.length
    : (allIncidents.results && allIncidents.results.length) || 0;
  const incidentNumber = `INC-${1001 + count}`;

  const newIncident = await Incident.create({
    incidentNumber,
    title: `${normalized.alertName} on ${service.name}`,
    summary: normalized.summary,
    severity: normalized.severity,
    status: 'TRIGGERED',
    serviceId: service._id,
    serviceName: service.name,
    serviceKey: service.key,
    source: `webhook:${normalized.sourceType}`,
    dedupKey: normalized.dedupKey,
    alertCount: 1,
    commanderName: 'Unassigned',
    checklist: getDefaultChecklist(normalized.severity),
    timeline: [
      {
        id: uuidv4(),
        timestamp: now,
        type: 'status_change',
        actor: { id: 'system', name: 'OpsFlow Alert Ingestion', role: 'system', isSystem: true },
        content: `Incident ${incidentNumber} automatically created via ${normalized.sourceType} webhook alert.`,
        metadata: { initialSeverity: normalized.severity },
      },
      {
        id: uuidv4(),
        timestamp: now,
        type: 'alert_ingest',
        actor: { id: 'system', name: 'Monitoring Agent', role: 'system', isSystem: true },
        content: `Alert: "${normalized.alertName}". Target Resource: ${normalized.resource}. Summary: ${normalized.summary}`,
        metadata: { payloadSnippet: payload },
      },
    ],
    warRoomChat: [
      {
        id: uuidv4(),
        sender: { id: 'system', name: 'OpsFlow Bot', role: 'system', avatar: '' },
        message: `🚨 War Room initialized for ${incidentNumber}. Paging primary on-call responders.`,
        timestamp: now,
      },
    ],
    metrics: {
      triggeredAt: now,
      mttaSeconds: 0,
      mttrSeconds: 0,
    },
  });

  // Update Service health status
  const targetHealth = normalized.severity === 'P1 - Critical' ? 'major_outage' : 'degraded';
  service.status = targetHealth;
  service.activeIncidentsCount = (service.activeIncidentsCount || 0) + 1;
  await service.save();

  // Log Webhook
  await WebhookLog.create({
    serviceKey: service.key,
    sourceType: normalized.sourceType,
    headers,
    payload,
    status: 'PROCESSED_NEW_INCIDENT',
    incidentId: newIncident._id,
    incidentNumber: newIncident.incidentNumber,
    dedupKey: normalized.dedupKey,
    ipAddress: ip,
  });

  // Broadcast real-time events
  socketService.emitIncidentCreated(newIncident);
  socketService.emitServiceUpdated(service);

  return {
    status: 'CREATED_NEW_INCIDENT',
    message: `New incident ${incidentNumber} triggered successfully.`,
    incidentNumber,
    incidentId: newIncident._id,
    severity: newIncident.severity,
    dedupKey: normalized.dedupKey,
  };
}

module.exports = {
  processAlertWebhook,
  normalizePayload,
};
