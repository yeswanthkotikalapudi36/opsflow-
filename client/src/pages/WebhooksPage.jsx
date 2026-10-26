import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { 
  Radio, 
  Terminal, 
  Copy, 
  Check, 
  ShieldAlert, 
  Layers, 
  RefreshCw, 
  Zap,
  Code2,
  ExternalLink
} from 'lucide-react';

export default function WebhooksPage({ onOpenSimulator }) {
  const { socket } = useSocket();
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await api.webhooks.getLogs();
      setLogs(res.logs || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (socket) {
      socket.on('incident:created', fetchLogs);
      socket.on('incident:updated', fetchLogs);
      return () => {
        socket.off('incident:created', fetchLogs);
        socket.off('incident:updated', fetchLogs);
      };
    }
  }, [socket]);

  const curlExample = `curl -X POST http://localhost:5001/api/webhooks/ingest/payment-gateway \\
  -H "Content-Type: application/json" \\
  -d '{
    "alerts": [
      {
        "labels": {
          "alertname": "Http5xxRateHigh",
          "instance": "prod-k8s-node-3",
          "severity": "critical"
        },
        "annotations": {
          "summary": "HTTP 5xx rate exceeded 18.4% on payment worker pods"
        }
      }
    ]
  }'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Telemetry Ingestion & Webhook Logs
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            External monitoring integration, payload normalization, and real-time alert deduplication audit trail.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchLogs} className="btn btn-secondary">
            <RefreshCw size={14} />
            <span>Refresh Logs</span>
          </button>
          <button onClick={onOpenSimulator} className="btn btn-primary">
            <Zap size={14} />
            <span>Simulate Webhook Alert</span>
          </button>
        </div>
      </div>

      {/* Engineering Explanation Card */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--brand-primary)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} />
          <span>How OpsFlow Alert Deduplication Works</span>
        </h3>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px' }}>
          When external monitors (Prometheus Alertmanager, Datadog, AWS CloudWatch, or custom scripts) send alerts during an outage, they frequently fire hundreds of duplicate notifications for the same underlying fault. 
          OpsFlow extracts the service key, error identifier, and target host to compute an immutable fingerprint: <code>serviceKey:alertName:resource</code>. 
          If an active incident already exists with this fingerprint, OpsFlow collapses the alert, increments the deduplication counter, and records an event on the War Room timeline rather than creating duplicate incidents.
        </p>

        <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={12} /> Test live from your command line:
            </span>
            <button
              onClick={copyCurl}
              style={{ background: 'none', border: 'none', color: copiedCurl ? 'var(--color-operational)' : 'var(--brand-primary)', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {copiedCurl ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedCurl ? 'Copied' : 'Copy curl command'}</span>
            </button>
          </div>
          <pre className="font-mono" style={{ fontSize: '0.725rem', color: '#a5f3fc', margin: 0, whiteSpace: 'pre-wrap' }}>
            {curlExample}
          </pre>
        </div>
      </div>

      {/* Webhook Logs Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedLog ? '1fr 400px' : '1fr', gap: '20px' }}>
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Recent Webhook Ingestions ({logs.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Click any log row to inspect JSON payload
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.725rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 16px' }}>Timestamp</th>
                <th style={{ padding: '10px 16px' }}>Target Service</th>
                <th style={{ padding: '10px 16px' }}>Source Monitor</th>
                <th style={{ padding: '10px 16px' }}>Ingestion Action</th>
                <th style={{ padding: '10px 16px' }}>Incident Linked</th>
                <th style={{ padding: '10px 16px' }}>Dedup Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No webhook logs found. Click "Simulate Webhook Alert" above to test.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSelected = selectedLog?._id === log._id;
                  const isDedup = log.status === 'PROCESSED_DEDUPLICATED';

                  return (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-dim)' }} className="font-mono">
                        {new Date(log.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {log.serviceKey}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {log.sourceType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isDedup ? '#fbbf24' : '#34d399',
                          background: isDedup ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${isDedup ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        }}>
                          {isDedup ? '⚡ DEDUPLICATED' : '🚨 NEW INCIDENT'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }} className="font-mono">
                        <span style={{ color: 'var(--brand-primary)' }}>{log.incidentNumber || 'N/A'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.725rem', color: 'var(--text-dim)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="font-mono">
                        {log.dedupKey || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Log Inspector */}
        {selectedLog && (
          <div className="glass-panel" style={{ padding: '16px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={16} /> Payload Inspector
              </h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}>
                ✕ Close
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Received: {new Date(selectedLog.receivedAt).toLocaleString()}
            </div>
            <pre className="font-mono" style={{
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.725rem',
              color: '#38bdf8',
              overflowX: 'auto',
              maxHeight: '400px',
            }}>
              {JSON.stringify(selectedLog.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
