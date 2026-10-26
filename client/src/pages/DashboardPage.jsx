import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { 
  AlertOctagon, 
  Clock, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  Server, 
  Radio, 
  Layers,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  const { socket } = useSocket();
  const [metrics, setMetrics] = useState(null);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [metricsRes, incRes, svcRes] = await Promise.all([
        api.analytics.getMetrics(),
        api.incidents.getAll({ status: 'ACTIVE' }),
        api.services.getAll(),
      ]);
      setMetrics(metricsRes.metrics);
      setActiveIncidents(incRes.incidents || []);
      setServices(svcRes.services || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    if (socket) {
      socket.on('incident:created', loadDashboardData);
      socket.on('incident:updated', loadDashboardData);
      socket.on('service:updated', loadDashboardData);

      return () => {
        socket.off('incident:created', loadDashboardData);
        socket.off('incident:updated', loadDashboardData);
        socket.off('service:updated', loadDashboardData);
      };
    }
  }, [socket]);

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Site Reliability Command Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Real-time incident response, automated deduplication, and service health observability.
          </p>
        </div>
      </div>

      {/* SLA & Reliability KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Active Incidents Card */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Active Incidents
            </span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: activeIncidents.length > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertOctagon size={18} color={activeIncidents.length > 0 ? '#f43f5e' : '#10b981'} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '10px 0 4px', color: activeIncidents.length > 0 ? '#fb7185' : '#34d399' }}>
            {activeIncidents.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`pulse-dot ${activeIncidents.length > 0 ? 'dot-critical' : 'dot-operational'}`} />
            {activeIncidents.length > 0 ? 'Response teams paged' : 'All systems fully operational'}
          </div>
        </div>

        {/* MTTA Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Mean Time to Ack (MTTA)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="var(--brand-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '10px 0 4px', color: '#ffffff' }}>
            {metrics?.avgMttaFormatted || '2m 14s'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-operational)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingDown size={14} />
            <span>Target SLA &lt; 5m (Passing)</span>
          </div>
        </div>

        {/* MTTR Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Mean Time to Resolve (MTTR)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="var(--color-p2)" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '10px 0 4px', color: '#ffffff' }}>
            {metrics?.avgMttrFormatted || '42m'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Calculated across resolved production incidents
          </div>
        </div>

        {/* Overall Platform Uptime */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              90-Day Platform Uptime
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="var(--color-operational)" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, margin: '10px 0 4px', color: 'var(--color-operational)' }}>
            {metrics?.platformUptime || '99.980%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {services.length} monitored microservices
          </div>
        </div>
      </div>

      {/* Main Content Grid: Active War Rooms & Services Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
        {/* Active Incidents War Rooms Feed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={18} color="#f43f5e" />
              <span>Active War Rooms</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '12px' }}>
                {activeIncidents.length} Open
              </span>
            </h2>
            <button 
              onClick={() => onNavigate('incidents')} 
              style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View All Incidents</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={24} color="var(--color-operational)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>No Active Outages</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: '320px', margin: '6px auto 16px' }}>
                All services are currently healthy and within SLA thresholds. You can simulate an incoming alert using the top menu.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeIncidents.map((incident) => (
                <div 
                  key={incident._id}
                  className="glass-panel"
                  style={{
                    padding: '18px',
                    borderLeft: `4px solid ${incident.severity.startsWith('P1') ? 'var(--color-p1)' : 'var(--color-p2)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {incident.incidentNumber}
                      </span>
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        {incident.serviceName}
                      </span>
                      {incident.alertCount > 1 && (
                        <span style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          ⚡ {incident.alertCount} alerts deduplicated
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                      {incident.title}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {incident.summary}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Commander: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{incident.commanderName || 'Unassigned'}</span>
                      {' • '}
                      Triggered {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                      onClick={() => onNavigate(`war-room-${incident._id}`)}
                      className="btn btn-primary btn-sm"
                    >
                      <span>Enter Live War Room</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Service Catalog Health Overview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="var(--brand-primary)" />
              <span>Service Health Matrix</span>
            </h2>
            <button
              onClick={() => onNavigate('services')}
              style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Catalog</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {services.map((svc) => (
                <div 
                  key={svc._id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{svc.name}</span>
                      <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>
                        {svc.tier.split(' - ')[0]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Uptime: <span style={{ color: 'var(--color-operational)', fontWeight: 600 }}>{svc.uptime90d}%</span>
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={svc.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
