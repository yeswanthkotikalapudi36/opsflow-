import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { sounds } from '../services/sound';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Send, 
  CheckSquare, 
  Clock, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  ShieldAlert, 
  UserCheck, 
  Plus, 
  Check, 
  Copy, 
  Download,
  AlertTriangle,
  Loader2,
  Terminal,
  Activity
} from 'lucide-react';

const STATUS_PIPELINE = ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'];

export default function WarRoomPage({ incidentId, onBack }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'timeline' | 'checklist' | 'postmortem'
  const [chatInput, setChatInput] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const chatEndRef = useRef(null);

  // Load incident details
  const fetchIncident = async () => {
    try {
      const res = await api.incidents.getById(incidentId);
      setIncident(res.incident);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load incident in war room:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [incidentId]);

  // Live Stopwatch timer
  useEffect(() => {
    if (!incident) return;
    const triggered = new Date(incident.metrics?.triggeredAt || incident.createdAt).getTime();
    const interval = setInterval(() => {
      const now = incident.status === 'RESOLVED' && incident.metrics?.resolvedAt
        ? new Date(incident.metrics.resolvedAt).getTime()
        : Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - triggered) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [incident]);

  // Socket.io Real-time Event Subscriptions
  useEffect(() => {
    if (!socket || !incidentId) return;

    socket.emit('join:incident', { incidentId, user });

    socket.on('war_room:message', (message) => {
      setIncident((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          warRoomChat: [...(prev.warRoomChat || []), message],
        };
      });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    socket.on('war_room:timeline_event', (event) => {
      setIncident((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeline: [...(prev.timeline || []), event],
        };
      });
    });

    socket.on('war_room:checklist_update', (checklist) => {
      setIncident((prev) => {
        if (!prev) return prev;
        return { ...prev, checklist };
      });
    });

    socket.on('war_room:incident_sync', (synced) => {
      setIncident(synced);
    });

    return () => {
      socket.emit('leave:incident', { incidentId, user });
      socket.off('war_room:message');
      socket.off('war_room:timeline_event');
      socket.off('war_room:checklist_update');
      socket.off('war_room:incident_sync');
    };
  }, [socket, incidentId, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab]);

  if (loading || !incident) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <div>Connecting to synchronized War Room bridge...</div>
      </div>
    );
  }

  // Handle State Transitions
  const handleTransition = async (targetStatus) => {
    try {
      const res = await api.incidents.updateStatus(incident._id, targetStatus);
      setIncident(res.incident);

      if (targetStatus === 'RESOLVED') {
        sounds.playResolve();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      alert(err.message || 'State transition rejected.');
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    try {
      await api.incidents.sendMessage(incident._id, text);
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  // Add Note to Timeline
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await api.incidents.addTimelineNote(incident._id, newNote.trim(), 'note');
      setNewNote('');
    } catch (err) {
      alert('Failed to add timeline note.');
    }
  };

  // Toggle Checklist Item
  const handleToggleChecklist = async (itemId) => {
    sounds.playCheck();
    try {
      const res = await api.incidents.toggleChecklist(incident._id, itemId);
      setIncident((prev) => ({ ...prev, checklist: res.checklist }));
    } catch (err) {
      console.error(err);
    }
  };

  // Add Checklist Item
  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    try {
      const res = await api.incidents.addChecklistItem(incident._id, newChecklistTitle.trim());
      setIncident((prev) => ({ ...prev, checklist: res.checklist }));
      setNewChecklistTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  // Assign self as Incident Commander
  const handleClaimCommander = async () => {
    try {
      let targetUserId = user?._id;
      if (!targetUserId) {
        const me = await api.auth.getMe();
        targetUserId = me?.user?._id;
      }
      if (!targetUserId) {
        alert('Please select an active responder identity first.');
        return;
      }
      const res = await api.incidents.assignRole(incident._id, targetUserId, 'commander');
      setIncident(res.incident);
    } catch (err) {
      alert(err.message || 'Failed to assign commander');
    }
  };

  // Generate Post-Mortem Report
  const handleGeneratePostMortem = async () => {
    setGeneratingAI(true);
    try {
      const res = await api.incidents.generatePostMortem(incident._id);
      setIncident((prev) => ({ ...prev, postMortem: res.postMortem }));
      setGeneratingAI(false);
      setActiveTab('postmortem');
    } catch (err) {
      setGeneratingAI(false);
      alert('Failed to generate post-mortem report.');
    }
  };

  const copyPostMortemMarkdown = () => {
    if (incident.postMortem?.markdown) {
      navigator.clipboard.writeText(incident.postMortem.markdown);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Back button & Incident Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          <span>Exit War Room</span>
        </button>
        <span className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
          {incident.incidentNumber}
        </span>
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
      </div>

      {/* Main War Room Banner Card */}
      <div className="glass-panel-elevated" style={{ padding: '22px', marginBottom: '20px', borderLeft: `6px solid ${incident.severity.startsWith('P1') ? 'var(--color-p1)' : 'var(--color-p2)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              {incident.title}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {incident.summary}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '0.775rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              <span>Target Service: <strong style={{ color: 'var(--text-main)' }}>{incident.serviceName}</strong></span>
              <span>Incident Commander: <strong style={{ color: 'var(--brand-primary)' }}>{incident.commanderName || 'Unassigned'}</strong></span>
              {incident.alertCount > 1 && (
                <span style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  ⚡ {incident.alertCount} alerts collapsed by Deduplication Engine
                </span>
              )}
            </div>
          </div>

          {/* Timers & SRE Metrics */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Live Elapsed Stopwatch */}
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Incident Duration
              </div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '4px 0' }}>
                {formatSeconds(elapsedSeconds)}
              </div>
              <div style={{ fontSize: '0.675rem', color: incident.status === 'RESOLVED' ? 'var(--color-operational)' : '#f43f5e' }}>
                {incident.status === 'RESOLVED' ? 'Final Resolution' : '● Live Stopwatch'}
              </div>
            </div>

            {/* MTTA Stopwatch / Value */}
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '110px' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                MTTA Time
              </div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
                {incident.metrics?.mttaSeconds ? `${Math.floor(incident.metrics.mttaSeconds / 60)}m ${incident.metrics.mttaSeconds % 60}s` : 'Pending'}
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>
                Target &lt; 5m
              </div>
            </div>
          </div>
        </div>

        {/* State Machine Pipeline Bar */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              State Machine Progression
            </span>
            {/* Quick Action Button for current state */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {incident.status === 'TRIGGERED' && (
                <button onClick={() => handleTransition('ACKNOWLEDGED')} className="btn btn-primary btn-sm">
                  <CheckSquare size={14} />
                  <span>Acknowledge Incident (Stop MTTA)</span>
                </button>
              )}
              {incident.status === 'ACKNOWLEDGED' && (
                <button onClick={() => handleTransition('INVESTIGATING')} className="btn btn-primary btn-sm">
                  <Activity size={14} />
                  <span>Begin Active Investigation</span>
                </button>
              )}
              {incident.status === 'INVESTIGATING' && (
                <>
                  <button onClick={() => handleTransition('IDENTIFIED')} className="btn btn-secondary btn-sm">
                    <span>Root Cause Identified</span>
                  </button>
                  <button onClick={() => handleTransition('RESOLVED')} className="btn btn-danger btn-sm">
                    <Check size={14} />
                    <span>Mitigate & Resolve Incident</span>
                  </button>
                </>
              )}
              {incident.status === 'IDENTIFIED' && (
                <button onClick={() => handleTransition('MONITORING')} className="btn btn-secondary btn-sm">
                  <span>Deploy Fix & Monitor</span>
                </button>
              )}
              {incident.status === 'MONITORING' && (
                <button onClick={() => handleTransition('RESOLVED')} className="btn btn-danger btn-sm">
                  <Check size={14} />
                  <span>Verify Recovery & Mark Resolved</span>
                </button>
              )}
              {incident.commanderName === 'Unassigned' && (
                <button onClick={handleClaimCommander} className="btn btn-secondary btn-sm">
                  <UserCheck size={14} />
                  <span>Claim Incident Commander</span>
                </button>
              )}
              <button 
                onClick={handleGeneratePostMortem} 
                disabled={generatingAI}
                className="btn btn-secondary btn-sm"
                style={{ borderColor: 'rgba(129, 140, 248, 0.4)', color: '#c7d2fe' }}
              >
                {generatingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} color="#818cf8" />}
                <span>{incident.postMortem?.summary ? 'Regenerate Post-Mortem' : 'Generate AI Post-Mortem'}</span>
              </button>
            </div>
          </div>

          {/* Stepper Display */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS_PIPELINE.length}, 1fr)`, gap: '8px' }}>
            {STATUS_PIPELINE.map((st, idx) => {
              const currentIdx = STATUS_PIPELINE.indexOf(incident.status);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div 
                  key={st}
                  onClick={() => {
                    if (st !== incident.status) handleTransition(st);
                  }}
                  style={{
                    background: isCurrent 
                      ? 'rgba(56, 189, 248, 0.2)' 
                      : isPast 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid',
                    borderColor: isCurrent 
                      ? 'var(--brand-primary)' 
                      : isPast 
                        ? 'rgba(16, 185, 129, 0.3)' 
                        : 'var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '8px 6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.675rem', fontWeight: 700, color: isCurrent ? 'var(--brand-primary)' : isPast ? 'var(--color-operational)' : 'var(--text-dim)' }}>
                    {isPast ? '✓ ' : ''}{st}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* War Room Working Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
        {[
          { id: 'chat', label: 'Live Responder Bridge', icon: MessageSquare, badge: (incident.warRoomChat || []).length },
          { id: 'timeline', label: 'Audit Timeline', icon: Clock, badge: (incident.timeline || []).length },
          { id: 'checklist', label: 'Mitigation Checklist', icon: CheckSquare, badge: `${(incident.checklist || []).filter(c => c.completed).length}/${(incident.checklist || []).length}` },
          { id: 'postmortem', label: 'AI Post-Mortem & RCA', icon: Sparkles, badge: incident.postMortem?.summary ? 'Ready' : null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--brand-primary)' : 'transparent'}`,
                background: 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--brand-primary)' : 'var(--text-dim)'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-dim)',
                  fontWeight: 600,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {/* 1. WAR ROOM CHAT */}
      {activeTab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(incident.warRoomChat || []).map((msg) => {
                const isMe = msg.sender?.id === user?._id;
                const isSystem = msg.sender?.id === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      margin: '4px auto',
                    }}>
                      🤖 {msg.message}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <img 
                      src={msg.sender?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&q=80'} 
                      alt="" 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: isMe ? 'var(--brand-primary)' : 'var(--text-main)' }}>
                          {msg.sender?.name}
                        </span>
                        <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{
                        background: isMe ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid',
                        borderColor: isMe ? 'rgba(56, 189, 248, 0.25)' : 'var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.825rem',
                        lineHeight: '1.4',
                        color: 'var(--text-main)',
                      }}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Share diagnostics, logs, or mitigation instructions with responders..."
                className="form-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>
          </div>

          {/* Connected Responders Sidebar */}
          <div className="glass-panel" style={{ padding: '16px', height: '520px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Assigned Responders ({incident.responders?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(incident.responders || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)'
                  }}>
                    {r.name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>{r.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. AUDIT TIMELINE */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Note Input */}
          <form onSubmit={handleAddNote} className="glass-panel" style={{ padding: '14px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Append formal diagnostic note or command execution to permanent incident audit log..."
              className="form-input"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              <Plus size={14} />
              <span>Add Note</span>
            </button>
          </form>

          {/* Timeline Events */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {(incident.timeline || []).slice().reverse().map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: item.type === 'status_change' ? 'rgba(56, 189, 248, 0.15)' : item.type === 'alert_ingest' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {item.type === 'status_change' ? <Activity size={14} color="#38bdf8" /> : item.type === 'alert_ingest' ? <ShieldAlert size={14} color="#fbbf24" /> : <Terminal size={14} color="var(--text-dim)" />}
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--brand-primary)' }}>
                        {item.actor?.name || 'System'}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {item.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MITIGATION CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
            Actionable Mitigation Steps
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {(incident.checklist || []).map((item) => (
              <div 
                key={item.id}
                onClick={() => handleToggleChecklist(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: item.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid',
                  borderColor: item.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  border: `2px solid ${item.completed ? 'var(--color-operational)' : 'var(--text-dim)'}`,
                  background: item.completed ? 'var(--color-operational)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {item.completed && <Check size={13} color="#fff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: '0.85rem',
                    color: item.completed ? 'var(--text-dim)' : 'var(--text-main)',
                    textDecoration: item.completed ? 'line-through' : 'none',
                  }}>
                    {item.title}
                  </span>
                  {item.completedBy && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-operational)', marginLeft: '10px' }}>
                      ✓ Completed by {item.completedBy}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add item form */}
          <form onSubmit={handleAddChecklist} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Add new mitigation step or verification task..."
              className="form-input"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              <Plus size={14} />
              <span>Add Task</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. AI POST-MORTEM & RCA */}
      {activeTab === 'postmortem' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {incident.postMortem?.summary || incident.postMortem?.executiveSummary ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                    Incident Root Cause Analysis & Post-Mortem
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Synthesized from {incident.timeline?.length || 0} timeline events, {incident.warRoomChat?.length || 0} messages, and alert metrics.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={copyPostMortemMarkdown} className="btn btn-secondary btn-sm">
                    {copiedMarkdown ? <Check size={14} color="var(--color-operational)" /> : <Copy size={14} />}
                    <span>{copiedMarkdown ? 'Copied Markdown' : 'Copy Report'}</span>
                  </button>
                  <button onClick={handleGeneratePostMortem} disabled={generatingAI} className="btn btn-primary btn-sm">
                    {generatingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>Regenerate RCA</span>
                  </button>
                </div>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '6px' }}>
                    1. Executive Summary
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    {incident.postMortem.executiveSummary || incident.postMortem.summary}
                  </p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171', marginBottom: '6px' }}>
                    2. Technical Root Cause (5 Whys)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    {incident.postMortem.rootCause}
                  </p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>
                    3. Impact & Blast Radius Analysis
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    {incident.postMortem.impactAnalysis}
                  </p>
                </div>

                {incident.postMortem.contributingFactors?.length > 0 && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                      4. Contributing Technical Factors
                    </h4>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                      {incident.postMortem.contributingFactors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {incident.postMortem.preventativeActions?.length > 0 && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-operational)', marginBottom: '6px' }}>
                      5. Corrective & Preventative Action Items
                    </h4>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                      {incident.postMortem.preventativeActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(129, 140, 248, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Sparkles size={28} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                Automated Post-Mortem Not Yet Generated
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px' }}>
                OpsFlow analyzes chronological timeline logs, responder chat transcripts, and telemetry thresholds to formulate a production-grade Root Cause Analysis report.
              </p>
              <button
                onClick={handleGeneratePostMortem}
                disabled={generatingAI}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderColor: '#818cf8' }}
              >
                {generatingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Generate Post-Mortem Report Now</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
