import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export default function CreateIncidentModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [severity, setSeverity] = useState('P2 - High');
  const [summary, setSummary] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.services.getAll().then((res) => {
        setServices(res.services || []);
        if (res.services?.length > 0 && !serviceId) {
          setServiceId(res.services[0]._id);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Incident title is required.');
      return;
    }
    if (!serviceId) {
      setError('Please select an impacted service.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.incidents.create({
        title,
        serviceId,
        severity,
        summary,
      });
      setLoading(false);
      onCreated(res.incident);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to declare incident.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }}>
      <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '520px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={18} color="#f43f5e" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Declare Live Incident</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initializes War Room, pages on-call SRE, and logs audit trail</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Incident Title *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Redis Session Eviction Spike on Auth Pods"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Impacted Service *
              </label>
              <select
                className="form-select"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.tier.split(' - ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Initial Severity *
              </label>
              <select
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="P1 - Critical">P1 - Critical (Outage)</option>
                <option value="P2 - High">P2 - High (Degraded)</option>
                <option value="P3 - Medium">P3 - Medium (Impaired)</option>
                <option value="P4 - Low">P4 - Low (Informational)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Summary & Initial Observations
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Describe symptoms, customer impact, error rate percentages, or recent deployments..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-danger">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
              <span>Declare & Open War Room</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
