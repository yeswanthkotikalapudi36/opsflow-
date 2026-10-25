const { v4: uuidv4 } = require('uuid');
const { User, Service, Incident, WebhookLog } = require('../models');

async function seedDatabase() {
  console.log('🌱 [Seeder] Checking existing data...');

  const existingUsers = await User.find({});
  const count = Array.isArray(existingUsers) ? existingUsers.length : existingUsers.results?.length || 0;

  if (count > 0) {
    console.log(`ℹ️ [Seeder] Database already populated with ${count} users. Skipping destructive re-seed.`);
    return;
  }

  console.log('⚡ [Seeder] Seeding fresh demo data for OpsFlow...');

  // 1. Create Core SRE Responders
  const alex = await User.create({
    name: 'Alex Mercer',
    email: 'alex@opsflow.internal',
    password: 'password123',
    role: 'incident_commander',
    title: 'Principal SRE & Incident Commander',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    phone: '+1 (415) 890-1234',
    onCallStatus: { isOnCall: true, tier: 1 },
  });

  const elena = await User.create({
    name: 'Elena Rostova',
    email: 'elena@opsflow.internal',
    password: 'password123',
    role: 'tech_lead',
    title: 'Staff Infrastructure Engineer',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    phone: '+1 (415) 890-5678',
    onCallStatus: { isOnCall: true, tier: 1 },
  });

  const david = await User.create({
    name: 'David Chen',
    email: 'david@opsflow.internal',
    password: 'password123',
    role: 'engineer',
    title: 'Database Reliability Engineer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    phone: '+1 (415) 890-9012',
    onCallStatus: { isOnCall: false, tier: 2 },
  });

  const demoUser = await User.create({
    name: 'Demo SRE Officer',
    email: 'demo@opsflow.dev',
    password: 'demo123',
    role: 'sre',
    title: 'Site Reliability Engineer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    phone: '+1 (555) 019-2834',
    onCallStatus: { isOnCall: true, tier: 1 },
  });

  // 2. Create Core Services Catalog
  const paymentSvc = await Service.create({
    name: 'Payment Gateway API',
    key: 'payment-gateway',
    description: 'Handles Stripe, PayPal, and multi-currency banking transactions.',
    tier: 'Tier 1 - Mission Critical',
    status: 'major_outage',
    uptime90d: 99.94,
    ownerTeam: 'Checkout & Payments SRE',
    webhookSecret: 'whsec_pay_9942a1bc',
    activeIncidentsCount: 1,
  });

  const authSvc = await Service.create({
    name: 'Auth & Identity Service',
    key: 'auth-service',
    description: 'OAuth2, JWT session validation, SAML SSO, and MFA verification.',
    tier: 'Tier 1 - Mission Critical',
    status: 'degraded',
    uptime90d: 99.98,
    ownerTeam: 'Security & Core IAM',
    webhookSecret: 'whsec_auth_4412f9ea',
    activeIncidentsCount: 1,
  });

  const dbSvc = await Service.create({
    name: 'PostgreSQL Primary Cluster',
    key: 'db-cluster-primary',
    description: 'Primary transactional database shard with Read-Replicas in us-east-1.',
    tier: 'Tier 1 - Mission Critical',
    status: 'operational',
    uptime90d: 99.99,
    ownerTeam: 'Data Infrastructure',
    webhookSecret: 'whsec_db_8831dc32',
    activeIncidentsCount: 0,
  });

  const orderSvc = await Service.create({
    name: 'Order Processing Engine',
    key: 'orders-api',
    description: 'Fulfillment queue, inventory reservation, and shipping status.',
    tier: 'Tier 1 - Mission Critical',
    status: 'operational',
    uptime90d: 99.97,
    ownerTeam: 'Commerce Platform',
    webhookSecret: 'whsec_orders_1190bc21',
    activeIncidentsCount: 0,
  });

  const notifSvc = await Service.create({
    name: 'Notification Service',
    key: 'notification-svc',
    description: 'Push notifications, SMS dispatch, and transactional email triggers.',
    tier: 'Tier 2 - Business Critical',
    status: 'operational',
    uptime90d: 99.88,
    ownerTeam: 'Communications Eng',
    webhookSecret: 'whsec_notif_7734bb99',
    activeIncidentsCount: 0,
  });

  // 3. Create Sample Incidents
  const now = new Date();
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Active P1 Incident
  await Incident.create({
    incidentNumber: 'INC-1001',
    title: 'Payment Gateway 504 Gateway Timeouts during checkout',
    summary: 'Spike in HTTP 504 timeouts on POST /v2/charges. Stripe webhook callbacks failing to process.',
    severity: 'P1 - Critical',
    status: 'INVESTIGATING',
    serviceId: paymentSvc._id,
    serviceName: paymentSvc.name,
    serviceKey: paymentSvc.key,
    source: 'webhook:prometheus',
    dedupKey: 'payment-gateway:http_504_rate_high:prod_k8s_node_3',
    alertCount: 14,
    commanderId: alex._id,
    commanderName: alex.name,
    responders: [
      { userId: alex._id, name: alex.name, role: 'Incident Commander', joinedAt: thirtyMinsAgo },
      { userId: elena._id, name: elena.name, role: 'Tech Lead', joinedAt: thirtyMinsAgo },
      { userId: david._id, name: david.name, role: 'Database SRE', joinedAt: tenMinsAgo },
    ],
    timeline: [
      {
        id: uuidv4(),
        timestamp: thirtyMinsAgo,
        type: 'status_change',
        actor: { id: 'system', name: 'Alert Ingestion', role: 'system', isSystem: true },
        content: 'Incident INC-1001 automatically triggered by Prometheus AlertManager webhook.',
      },
      {
        id: uuidv4(),
        timestamp: new Date(thirtyMinsAgo.getTime() + 2 * 60 * 1000),
        type: 'status_change',
        actor: { id: alex._id, name: alex.name, role: alex.role },
        content: 'Alex Mercer acknowledged incident and assumed role of Incident Commander.',
      },
      {
        id: uuidv4(),
        timestamp: new Date(thirtyMinsAgo.getTime() + 5 * 60 * 1000),
        type: 'note',
        actor: { id: elena._id, name: elena.name, role: elena.role },
        content: 'Confirmed gateway timeouts correlate with a 300% surge in database read lock waits on the checkout ledger table.',
      },
      {
        id: uuidv4(),
        timestamp: tenMinsAgo,
        type: 'alert_ingest',
        actor: { id: 'system', name: 'OpsFlow Deduplication Engine', role: 'system', isSystem: true },
        content: 'Deduplicated alert #14 suppressed: identical fingerprint [payment-gateway:http_504_rate_high:prod_k8s_node_3].',
      },
    ],
    checklist: [
      { id: uuidv4(), title: 'Acknowledge incident and assign Incident Commander', completed: true, completedBy: alex.name, completedAt: thirtyMinsAgo },
      { id: uuidv4(), title: 'Inspect recent deployment logs & commits in CI/CD', completed: true, completedBy: elena.name, completedAt: tenMinsAgo },
      { id: uuidv4(), title: 'Post initial customer notice to Public Status Page', completed: true, completedBy: alex.name, completedAt: tenMinsAgo },
      { id: uuidv4(), title: 'Prepare traffic divert / blue-green rollback procedure', completed: false },
      { id: uuidv4(), title: 'Open War Room bridge and notify executive stakeholders', completed: true, completedBy: alex.name, completedAt: thirtyMinsAgo },
    ],
    warRoomChat: [
      {
        id: uuidv4(),
        sender: { id: 'system', name: 'OpsFlow Bot', role: 'system', avatar: '' },
        message: '🚨 P1 War Room initialized. Primary SRE team paged.',
        timestamp: thirtyMinsAgo,
      },
      {
        id: uuidv4(),
        sender: { id: alex._id, name: alex.name, role: alex.role, avatar: alex.avatar },
        message: 'I have taken Incident Commander. Elena, can you check if the last canary deploy at 18:15 UTC is causing this?',
        timestamp: new Date(thirtyMinsAgo.getTime() + 3 * 60 * 1000),
      },
      {
        id: uuidv4(),
        sender: { id: elena._id, name: elena.name, role: elena.role, avatar: elena.avatar },
        message: 'Checking logs now. Seeing TCP connection pool exhaustion on payment worker pods.',
        timestamp: new Date(thirtyMinsAgo.getTime() + 6 * 60 * 1000),
      },
      {
        id: uuidv4(),
        sender: { id: david._id, name: david.name, role: david.role, avatar: david.avatar },
        message: 'Joined. Database connection pool is at 98% utilization. Terminating idle connections now.',
        timestamp: tenMinsAgo,
      },
    ],
    metrics: {
      triggeredAt: thirtyMinsAgo,
      acknowledgedAt: new Date(thirtyMinsAgo.getTime() + 2 * 60 * 1000),
      mttaSeconds: 120,
      mttrSeconds: 0,
    },
  });

  // Active P2 Incident
  await Incident.create({
    incidentNumber: 'INC-1002',
    title: 'Auth Service latency degradation on /oauth/token',
    summary: 'p99 latency reached 2,400ms. Token verification cache hit ratio dropped below 40%.',
    severity: 'P2 - High',
    status: 'ACKNOWLEDGED',
    serviceId: authSvc._id,
    serviceName: authSvc.name,
    serviceKey: authSvc.key,
    source: 'webhook:datadog',
    dedupKey: 'auth-service:p99_latency_high:redis_cluster',
    alertCount: 5,
    commanderId: elena._id,
    commanderName: elena.name,
    responders: [{ userId: elena._id, name: elena.name, role: 'Incident Commander', joinedAt: tenMinsAgo }],
    timeline: [
      {
        id: uuidv4(),
        timestamp: tenMinsAgo,
        type: 'status_change',
        actor: { id: 'system', name: 'Alert Ingestion', role: 'system', isSystem: true },
        content: 'Incident INC-1002 triggered via Datadog monitor alert.',
      },
      {
        id: uuidv4(),
        timestamp: new Date(tenMinsAgo.getTime() + 1 * 60 * 1000),
        type: 'status_change',
        actor: { id: elena._id, name: elena.name, role: elena.role },
        content: 'Elena Rostova acknowledged incident.',
      },
    ],
    checklist: [
      { id: uuidv4(), title: 'Acknowledge incident and assign Incident Commander', completed: true, completedBy: elena.name, completedAt: tenMinsAgo },
      { id: uuidv4(), title: 'Check Redis session cache memory limits and evictions', completed: false },
      { id: uuidv4(), title: 'Scale Auth replica pods to handle ingress traffic', completed: false },
    ],
    warRoomChat: [
      {
        id: uuidv4(),
        sender: { id: elena._id, name: elena.name, role: elena.role, avatar: elena.avatar },
        message: 'Looking into Redis cache eviction rates. Suspecting hot key overload on service account tokens.',
        timestamp: tenMinsAgo,
      },
    ],
    metrics: {
      triggeredAt: tenMinsAgo,
      acknowledgedAt: new Date(tenMinsAgo.getTime() + 1 * 60 * 1000),
      mttaSeconds: 60,
      mttrSeconds: 0,
    },
  });

  // Resolved Incident with Post-Mortem
  await Incident.create({
    incidentNumber: 'INC-1003',
    title: 'Database connection pool saturation on Primary Shard',
    summary: 'Unindexed query from analytics pipeline caused full table scan and saturated connection pool.',
    severity: 'P1 - Critical',
    status: 'RESOLVED',
    serviceId: dbSvc._id,
    serviceName: dbSvc.name,
    serviceKey: dbSvc.key,
    source: 'webhook:cloudwatch',
    dedupKey: 'db-cluster-primary:connections_exhausted:master',
    alertCount: 8,
    commanderId: alex._id,
    commanderName: alex.name,
    responders: [
      { userId: alex._id, name: alex.name, role: 'Incident Commander', joinedAt: twoHoursAgo },
      { userId: david._id, name: david.name, role: 'Database SRE', joinedAt: twoHoursAgo },
    ],
    timeline: [
      {
        id: uuidv4(),
        timestamp: twoHoursAgo,
        type: 'status_change',
        actor: { id: 'system', name: 'Alert Ingestion', role: 'system', isSystem: true },
        content: 'Incident INC-1003 triggered via CloudWatch DB Connection Threshold.',
      },
      {
        id: uuidv4(),
        timestamp: oneHourAgo,
        type: 'status_change',
        actor: { id: alex._id, name: alex.name, role: alex.role },
        content: 'Status changed to RESOLVED after terminating rogue analytical query and creating composite index.',
      },
    ],
    checklist: [
      { id: uuidv4(), title: 'Acknowledge incident and assign Incident Commander', completed: true, completedBy: alex.name },
      { id: uuidv4(), title: 'Kill blocking backend PID queries', completed: true, completedBy: david.name },
      { id: uuidv4(), title: 'Verify read replica replication lag < 100ms', completed: true, completedBy: david.name },
    ],
    warRoomChat: [
      {
        id: uuidv4(),
        sender: { id: david._id, name: david.name, role: david.role, avatar: david.avatar },
        message: 'Terminated query PID 88914. Latency immediately fell back to baseline 12ms.',
        timestamp: oneHourAgo,
      },
    ],
    metrics: {
      triggeredAt: twoHoursAgo,
      acknowledgedAt: new Date(twoHoursAgo.getTime() + 2 * 60 * 1000),
      resolvedAt: oneHourAgo,
      mttaSeconds: 120,
      mttrSeconds: 3600,
    },
    postMortem: {
      generatedAt: oneHourAgo,
      executiveSummary: 'On the morning of the outage, the primary transactional database cluster experienced severe thread pool exhaustion due to an unindexed query executed by an automated data pipeline. Traffic returned to normal after killing the offending query and deploying query timeouts.',
      rootCause: 'Data sync job issued a full table scan against the 40M-row audit table without query pagination or statement timeouts.',
      impactAnalysis: 'All services dependent on write transactions experienced 500 errors for 45 minutes.',
      contributingFactors: [
        'Analytics pipelines were allowed direct access to the OLTP primary rather than the read replica.',
        'Default PostgreSQL statement timeout was set to infinite (0).',
      ],
      preventativeActions: [
        '[Data Team] Route all analytical queries strictly through Read Replicas.',
        '[SRE] Enforce a mandatory 15-second statement timeout on the primary database.',
      ],
      lessonsLearned: [
        'Connection limits must be segmented between interactive web traffic and background jobs.',
      ],
      markdown: `# Post-Mortem Report: INC-1003 Database Connection Saturation\n\nFull mitigation completed. Analytical queries isolated.`,
    },
  });

  // 4. Create Webhook Logs for telemetry display
  await WebhookLog.create({
    serviceKey: paymentSvc.key,
    sourceType: 'prometheus',
    payload: { alertname: 'High5xxRate', instance: 'prod-k8s-node-3', severity: 'critical' },
    status: 'PROCESSED_NEW_INCIDENT',
    incidentNumber: 'INC-1001',
    dedupKey: 'payment-gateway:http_504_rate_high:prod_k8s_node_3',
    receivedAt: thirtyMinsAgo,
  });

  await WebhookLog.create({
    serviceKey: paymentSvc.key,
    sourceType: 'prometheus',
    payload: { alertname: 'High5xxRate', instance: 'prod-k8s-node-3', severity: 'critical' },
    status: 'PROCESSED_DEDUPLICATED',
    incidentNumber: 'INC-1001',
    dedupKey: 'payment-gateway:http_504_rate_high:prod_k8s_node_3',
    receivedAt: tenMinsAgo,
  });

  await WebhookLog.create({
    serviceKey: authSvc.key,
    sourceType: 'datadog',
    payload: { title: 'Redis p99 Latency High', alert_type: 'error', hostname: 'redis-01' },
    status: 'PROCESSED_NEW_INCIDENT',
    incidentNumber: 'INC-1002',
    dedupKey: 'auth-service:p99_latency_high:redis_cluster',
    receivedAt: tenMinsAgo,
  });

  console.log('✅ [Seeder] OpsFlow database seeded successfully!');
  console.log('🔑 Demo Login Accounts:');
  console.log('   - SRE Lead: alex@opsflow.internal / password123');
  console.log('   - Demo User: demo@opsflow.dev / demo123');
}

// If executed directly via CLI
if (require.main === module) {
  const { connectDB } = require('../db');
  (async () => {
    await connectDB();
    await seedDatabase();
    process.exit(0);
  })();
}

module.exports = { seedDatabase };
