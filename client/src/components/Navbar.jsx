import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Activity, 
  Bell, 
  Radio, 
  Plus, 
  ExternalLink, 
  User as UserIcon, 
  Check, 
  ChevronDown, 
  ShieldAlert,
  X
} from 'lucide-react';

export default function Navbar({ onOpenDeclare, onOpenWebhookSim, onNavigate }) {
  const { user, switchDemoAccount, logout } = useAuth();
  const { connected, notifications, dismissNotification } = useSocket();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav style={{
      height: '64px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 15, 29, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Brand & Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div 
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
          }}>
            <Activity size={20} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Ops<span style={{ color: 'var(--brand-primary)' }}>Flow</span>
          </span>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--brand-primary)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            RELIABILITY
          </span>
        </div>

        {/* Live Socket Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <span className={`pulse-dot ${connected ? 'dot-operational' : 'dot-critical'}`} />
          <span>{connected ? 'Live Sync Active' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Action Buttons & Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Webhook Simulator Trigger */}
        <button 
          onClick={onOpenWebhookSim}
          className="btn btn-secondary btn-sm"
          title="Simulate incoming monitoring webhook alerts"
        >
          <Radio size={14} color="var(--brand-primary)" />
          <span>Simulate Alert</span>
        </button>

        {/* Declare Incident CTA */}
        <button 
          onClick={onOpenDeclare}
          className="btn btn-primary btn-sm"
          style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
        >
          <Plus size={15} />
          <span>Declare Incident</span>
        </button>

        {/* Public Status Page Shortcut */}
        <button
          onClick={() => onNavigate('status-page')}
          className="btn btn-secondary btn-sm"
          title="View customer-facing Public Status Page"
        >
          <ExternalLink size={14} />
          <span>Status Page</span>
        </button>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Bell size={16} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#f43f5e',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-dark)',
              }}>
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div className="glass-panel-elevated" style={{
              position: 'absolute',
              right: 0,
              top: '46px',
              width: '340px',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '12px',
              zIndex: 50,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>Live Incident Telemetry</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{notifications.length} alerts</span>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  No recent alert triggers. All systems nominal.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    marginBottom: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, color: '#f87171' }}>{n.title}</span>
                      <button 
                        onClick={() => dismissNotification(n.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
                    {n.incidentId && (
                      <button
                        onClick={() => {
                          setShowNotifs(false);
                          onNavigate(`war-room-${n.incidentId}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: '6px',
                          display: 'block',
                          padding: 0,
                        }}
                      >
                        Open Incident War Room →
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Account Menu with Evaluator Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&q=80'}
              alt={user?.name || 'User'}
              style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.name || 'SRE Officer'}</div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>{user?.title || 'Lead'}</div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showUserMenu && (
            <div className="glass-panel-elevated" style={{
              position: 'absolute',
              right: 0,
              top: '46px',
              width: '260px',
              padding: '12px',
              zIndex: 50,
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Evaluator Role Switcher
              </div>
              <div 
                onClick={() => { switchDemoAccount('alex@opsflow.internal'); setShowUserMenu(false); }}
                style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', background: user?.email === 'alex@opsflow.internal' ? 'rgba(56, 189, 248, 0.15)' : 'transparent', marginBottom: '4px', fontSize: '0.8rem' }}
              >
                <div style={{ fontWeight: 600 }}>Alex Mercer (IC Lead)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Principal Incident Commander</div>
              </div>
              <div 
                onClick={() => { switchDemoAccount('elena@opsflow.internal'); setShowUserMenu(false); }}
                style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', background: user?.email === 'elena@opsflow.internal' ? 'rgba(56, 189, 248, 0.15)' : 'transparent', marginBottom: '4px', fontSize: '0.8rem' }}
              >
                <div style={{ fontWeight: 600 }}>Elena Rostova (Tech Lead)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Staff Infrastructure SRE</div>
              </div>
              <div 
                onClick={() => { switchDemoAccount('demo@opsflow.dev'); setShowUserMenu(false); }}
                style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', background: user?.email === 'demo@opsflow.dev' ? 'rgba(56, 189, 248, 0.15)' : 'transparent', marginBottom: '8px', fontSize: '0.8rem' }}
              >
                <div style={{ fontWeight: 600 }}>Demo SRE Officer</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>General Responding Engineer</div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  style={{ width: '100%', background: 'none', border: 'none', color: '#f87171', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', padding: '6px 8px' }}
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
