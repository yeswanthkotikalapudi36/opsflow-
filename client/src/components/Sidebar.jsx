import React from 'react';
import { 
  LayoutDashboard, 
  AlertOctagon, 
  Server, 
  Radio, 
  Activity, 
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ currentTab, onNavigate, activeIncidentsCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { 
      id: 'incidents', 
      label: 'Incident Manager', 
      icon: AlertOctagon, 
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : null,
      badgeColor: '#f43f5e'
    },
    { id: 'services', label: 'Service Catalog', icon: Server },
    { id: 'webhooks', label: 'Webhooks & Ingest', icon: Radio },
    { id: 'status-page', label: 'Public Status Page', icon: Activity },
  ];

  return (
    <aside style={{
      width: '240px',
      borderRight: '1px solid var(--border-subtle)',
      background: 'rgba(10, 15, 29, 0.65)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 14px',
      minHeight: 'calc(100vh - 64px)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          fontSize: '0.675rem',
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '6px 12px',
          marginBottom: '4px',
        }}>
          Reliability Console
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isActive ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)' 
                  : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={17} color={isActive ? 'var(--brand-primary)' : 'var(--text-dim)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  background: item.badgeColor,
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SRE On-Call Shift Card */}
      <div className="glass-panel" style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <ShieldCheck size={16} color="var(--color-operational)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>On-Call Status</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Tier 1 Primary: <span style={{ color: '#fff', fontWeight: 600 }}>Alex Mercer</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
          Escalation SLA: <span style={{ color: '#fbbf24' }}>5 min auto-paging</span>
        </div>
      </div>
    </aside>
  );
}
