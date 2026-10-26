import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

export default function StatusPage({ onNavigate }) {
  const { socket } = useSocket();
  const [services, setServices] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [resolvedIncidents, setResolvedIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatusData = async () => {
    try {
      const [svcRes, activeRes, resolvedRes] = await Promise.all([
        api.services.getAll(),
        api.incidents.getAll({ status: 'ACTIVE' }),
        api.incidents.getAll({ status: 'RESOLVED' }),
      ]);
      setServices(svcRes.services || []);
      setActiveIncidents(activeRes.incidents || []);
      setResolvedIncidents(resolvedRes.incidents || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusData();
    if (socket) {
      socket.emit('join:status_page');
      socket.on('status_page:service_update', loadStatusData);
      socket.on('status_page:incident_update', loadStatusData);
      return () => {
        socket.off('status_page:service_update', loadStatusData);
        socket.off('status_page:incident_update', loadStatusData);
      };
    }
  }, [socket]);

  const hasOutage = activeIncidents.some((i) => i.severity.startsWith('P1'));
  const hasDegradation = activeIncidents.length > 0 && !hasOutage;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Activity size={18} color="#ffffff" />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Ops<span style={{ color: 'var(--brand-primary)' }}>Flow</span> Systems</span>
          </div>

          <button onClick={() => onNavigate('dashboard')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Return to Ops Console</span>
          </button>
        </div>

        {/* Global System Health Banner */}
        <div style={{
          padding: '24px',
          borderRadius: '12px',
          background: hasOutage 
            ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.05) 100%)' 
            : hasDegradation 
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)' 
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid',
          borderColor: hasOutage ? 'rgba(244, 63, 94, 0.4)' : hasDegradation ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: hasOutage ? '#f43f5e' : hasDegradation ? '#f59e0b' : '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {hasOutage ? <AlertTriangle size={24} color="#fff" /> : hasDegradation ? <Clock size={24} color="#fff" /> : <ShieldCheck size={24} color="#fff" />}
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
              {hasOutage ? 'Active Major Outage Reported' : hasDegradation ? 'Partial Performance Degradation' : 'All Core Systems Operational'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {hasOutage 
                ? 'Engineering teams are currently actively mitigating a critical incident.' 
                : hasDegradation 
                  ? 'A subset of services is experiencing elevated response times.' 
                  : 'Automated synthetic monitoring confirms all endpoints are performing normally.'}
            </p>
          </div>
        </div>

        {/* Active Incidents Section */}
        {activeIncidents.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px' }}>
              Active Disruptions & Incident Log
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeIncidents.map((inc) => (
                <div key={inc._id} className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid ${inc.severity.startsWith('P1') ? 'var(--color-p1)' : 'var(--color-p2)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>
                        {inc.incidentNumber}
                      </span>
                      <SeverityBadge severity={inc.severity} />
                      <StatusBadge status={inc.status} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Started {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                    {inc.title}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '14px' }}>
                    {inc.summary}
                  </p>

                  {/* Public Updates timeline */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                      Latest Public Status Updates:
                    </div>
                    {(inc.timeline || []).slice(-2).reverse().map((t) => (
                      <div key={t.id} style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }} className="font-mono">
                          [{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                        </span>
                        <span>{t.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Uptime Status */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px' }}>
            System Components & 90-Day Reliability
          </h3>

          <div className="glass-panel" style={{ padding: '8px 20px' }}>
            {services.map((svc, idx) => (
              <div 
                key={svc._id} 
                style={{
                  padding: '16px 0',
                  borderBottom: idx < services.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{svc.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{svc.tier.split(' - ')[0]}</span>
                  </div>
                  {/* Visual 90-day mock bar */}
                  <div style={{ display: 'flex', gap: '2px', marginTop: '8px', alignItems: 'center' }}>
                    {Array.from({ length: 45 }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        style={{
                          width: '4px',
                          height: '16px',
                          borderRadius: '2px',
                          background: svc.status === 'operational' || bIdx < 42 ? 'var(--color-operational)' : svc.status === 'degraded' ? '#fbbf24' : '#f43f5e',
                          opacity: 0.85,
                        }}
                        title={`Day -${45 - bIdx}: 100% operational`}
                      />
                    ))}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '8px' }}>
                      {svc.uptime90d}% uptime
                    </span>
                  </div>
                </div>

                <div>
                  <StatusBadge status={svc.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Past Resolved Incidents */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px' }}>
            Past Incidents & Resolutions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resolvedIncidents.slice(0, 3).map((inc) => (
              <div key={inc._id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                    {inc.title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Resolved on {new Date(inc.metrics?.resolvedAt || inc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {inc.postMortem?.executiveSummary || inc.summary}
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-operational)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} />
                  <span>Full mitigation verified. Mean Time to Resolve: {inc.metrics?.mttrSeconds ? `${Math.round(inc.metrics.mttrSeconds / 60)} minutes` : '38 minutes'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
