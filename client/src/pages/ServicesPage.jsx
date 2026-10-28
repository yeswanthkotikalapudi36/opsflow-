import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import { 
  Server, 
  Plus, 
  ShieldCheck, 
  Copy, 
  Check, 
  Activity, 
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';

export default function ServicesPage() {
  const { socket } = useSocket();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // New service form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState('Tier 1 - Mission Critical');
  const [ownerTeam, setOwnerTeam] = useState('Core Platform SRE');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await api.services.getAll();
      setServices(res.services || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    if (socket) {
      socket.on('service:updated', fetchServices);
      socket.on('incident:updated', fetchServices);
      return () => {
        socket.off('service:updated', fetchServices);
        socket.off('incident:updated', fetchServices);
      };
    }
  }, [socket]);

  const handleCopyWebhookUrl = (serviceKey) => {
    const backendBase = import.meta.env.PROD ? 'https://opsflow-1-xd2t.onrender.com' : 'http://localhost:5001';
    const url = `${backendBase}/api/webhooks/ingest/${serviceKey}`;
    navigator.clipboard.writeText(url);
    setCopiedKey(serviceKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setModalLoading(true);
    try {
      await api.services.create({
        name,
        key,
        description,
        tier,
        ownerTeam,
      });
      setModalLoading(false);
      setShowCreateModal(false);
      setName('');
      setKey('');
      setDescription('');
      fetchServices();
    } catch (err) {
      setModalLoading(false);
      alert(err.message || 'Failed to register service.');
    }
  };

  const handleStatusChange = async (serviceKey, newStatus) => {
    try {
      await api.services.updateStatus(serviceKey, newStatus);
      fetchServices();
    } catch (err) {
      alert('Failed to update service health status.');
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Service Reliability Catalog
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Registered microservices, dependencies, SLA tiers, and incoming webhook ingestion endpoints.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Register Service</span>
        </button>
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {services.map((svc) => (
          <div key={svc._id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{svc.name}</h3>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginTop: '2px' }}>
                    key: {svc.key}
                  </div>
                </div>
                <StatusBadge status={svc.status} />
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '16px', minHeight: '36px' }}>
                {svc.description || 'No description provided.'}
              </p>

              {/* Metrics & Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Service Tier</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {svc.tier.split(' - ')[0]}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>90-Day Uptime</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-operational)', marginTop: '2px' }}>
                    {svc.uptime90d}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Owner Team</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '2px' }}>
                    {svc.ownerTeam}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Incidents</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: svc.activeIncidentsCount > 0 ? '#f43f5e' : 'var(--text-muted)', marginTop: '2px' }}>
                    {svc.activeIncidentsCount} Open
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Webhook Copy & Manual Health Override */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>Webhook URL</span>
                <button
                  onClick={() => handleCopyWebhookUrl(svc.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedKey === svc.key ? 'var(--color-operational)' : 'var(--brand-primary)',
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === svc.key ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedKey === svc.key ? 'Copied' : 'Copy Ingest Endpoint'}</span>
                </button>
              </div>

              {/* Status Health Override selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>Override Health:</span>
                <select
                  className="form-select"
                  style={{ padding: '3px 8px', fontSize: '0.75rem', flex: 1 }}
                  value={svc.status}
                  onChange={(e) => handleStatusChange(svc.key, e.target.value)}
                >
                  <option value="operational">Operational</option>
                  <option value="degraded">Degraded</option>
                  <option value="partial_outage">Partial Outage</option>
                  <option value="major_outage">Major Outage</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Register Service */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register New Service</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Checkout Service"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Service Identifier Key (for Webhooks)
                </label>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. checkout-service"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    SLA Tier
                  </label>
                  <select className="form-select" value={tier} onChange={(e) => setTier(e.target.value)}>
                    <option value="Tier 1 - Mission Critical">Tier 1 - Mission Critical</option>
                    <option value="Tier 2 - Business Critical">Tier 2 - Business Critical</option>
                    <option value="Tier 3 - Supporting">Tier 3 - Supporting</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Owner Team
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={ownerTeam}
                    onChange={(e) => setOwnerTeam(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Responsibilities, dependencies, and cluster..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={modalLoading} className="btn btn-primary">
                  {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Register Service</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
