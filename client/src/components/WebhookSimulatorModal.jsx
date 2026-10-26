import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Radio, Copy, Check, Terminal, Zap, Loader2, ArrowRight } from 'lucide-react';

const PRESETS = [
  {
    name: 'Prometheus High 5xx Error Rate',
    alertType: 'Http5xxRateHigh',
    severity: 'critical',
    serviceKey: 'payment-gateway',
    message: 'HTTP 5xx rate exceeded 18.4% on /v2/charges endpoint in prod-cluster-us-east',
  },
  {
    name: 'Datadog Container OOM Killer',
    alertType: 'ContainerMemoryOOM',
    severity: 'error',
    serviceKey: 'auth-service',
    message: 'Pod auth-service-7bb8 was terminated by Linux kernel OOM Killer (cgroup limit exceeded 2GiB)',
  },
  {
    name: 'CloudWatch DB Connection Spike',
    alertType: 'DBConnectionsThresholdExceeded',
    severity: 'critical',
    serviceKey: 'db-cluster-primary',
    message: 'PostgreSQL active connection pool reached 96% of max_connections (480/500)',
  },
  {
    name: 'Pingdom External Uptime Health Probe',
    alertType: 'HealthCheckFailed',
    severity: 'critical',
    serviceKey: 'orders-api',
    message: 'Global pingdom synthetic probe from Tokyo, Frankfurt, and Virginia reported HTTP 502 Bad Gateway',
  },
];

export default function WebhookSimulatorModal({ isOpen, onClose, onAlertFired }) {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('payment-gateway');
  const [alertType, setAlertType] = useState('Http5xxRateHigh');
  const [severity, setSeverity] = useState('critical');
  const [message, setMessage] = useState('HTTP 5xx rate exceeded 18.4% on /v2/charges endpoint');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.services.getAll().then((res) => {
        setServices(res.services || []);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (p) => {
    setSelectedService(p.serviceKey);
    setAlertType(p.alertType);
    setSeverity(p.severity);
    setMessage(p.message);
    setLastResult(null);
  };

  const handleFireWebhook = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await api.webhooks.testTrigger({
        serviceKey: selectedService,
        alertType,
        severity,
        message,
      });
      setLoading(false);
      setLastResult(res);
      if (onAlertFired) onAlertFired(res);
    } catch (err) {
      setLoading(false);
      setLastResult({ error: err.message || 'Failed to trigger webhook' });
    }
  };

  const curlCommand = `curl -X POST http://localhost:5001/api/webhooks/ingest/${selectedService} \\
  -H "Content-Type: application/json" \\
  -d '{
    "alerts": [{
      "labels": { "alertname": "${alertType}", "severity": "${severity}" },
      "annotations": { "summary": "${message}" }
    }]
  }'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '640px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Radio size={18} color="var(--brand-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Telemetry & Webhook Ingestion Simulator</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulate Prometheus, Datadog, or AWS monitoring alerts with live deduplication</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Quick Presets
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  fontSize: '0.775rem',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{p.name}</div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Target: {p.serviceKey}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Target Service Key
            </label>
            <select
              className="form-select"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              {services.map((s) => (
                <option key={s._id} value={s.key}>
                  {s.name} ({s.key})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Alert Severity Level
            </label>
            <select
              className="form-select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="critical">Critical (Triggers P1 Incident)</option>
              <option value="error">Error / High (Triggers P2 Incident)</option>
              <option value="warning">Warning (Triggers P3 Incident)</option>
              <option value="info">Info / Low (Triggers P4 Incident)</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
            Alert Fingerprint Identifier (alertname)
          </label>
          <input
            type="text"
            className="form-input font-mono"
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
            Alert Summary / Telemetry Payload
          </label>
          <input
            type="text"
            className="form-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Result banner */}
        {lastResult && (
          <div style={{
            background: lastResult.error 
              ? 'rgba(244, 63, 94, 0.15)' 
              : lastResult.status === 'DEDUPLICATED' 
                ? 'rgba(245, 158, 11, 0.15)' 
                : 'rgba(16, 185, 129, 0.15)',
            border: '1px solid',
            borderColor: lastResult.error 
              ? 'rgba(244, 63, 94, 0.3)' 
              : lastResult.status === 'DEDUPLICATED' 
                ? 'rgba(245, 158, 11, 0.3)' 
                : 'rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '0.825rem',
          }}>
            {lastResult.error ? (
              <div style={{ color: '#fb7185' }}>Error: {lastResult.error}</div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, color: lastResult.status === 'DEDUPLICATED' ? '#fbbf24' : '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {lastResult.status === 'DEDUPLICATED' ? '⚡ ALERT DEDUPLICATED & COLLAPSED' : '🚨 NEW INCIDENT CREATED'}
                </div>
                <div style={{ marginTop: '4px', color: 'var(--text-main)' }}>{lastResult.message}</div>
                <div style={{ marginTop: '4px', fontSize: '0.725rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  Fingerprint: {lastResult.dedupKey} {lastResult.alertCount && `| Total Occurrences: ${lastResult.alertCount}`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Copyable curl terminal command */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={12} /> Test from your local terminal with curl
            </span>
            <button
              onClick={copyCurl}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? 'var(--color-operational)' : 'var(--brand-primary)',
                cursor: 'pointer',
                fontSize: '0.725rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy curl'}</span>
            </button>
          </div>
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.725rem',
            color: '#a5f3fc',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}>
            {curlCommand}
          </pre>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button 
            type="button" 
            onClick={handleFireWebhook} 
            disabled={loading} 
            className="btn btn-primary"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            <span>Fire Ingestion Webhook</span>
          </button>
        </div>
      </div>
    </div>
  );
}
