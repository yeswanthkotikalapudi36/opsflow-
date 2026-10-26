import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { Search, Filter, Plus, ArrowRight, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function IncidentsPage({ onNavigate, onOpenDeclare }) {
  const { socket } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const res = await api.incidents.getAll({
        status: statusFilter,
        severity: severityFilter,
        search,
      });
      setIncidents(res.incidents || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter, search]);

  useEffect(() => {
    if (socket) {
      socket.on('incident:created', fetchIncidents);
      socket.on('incident:updated', fetchIncidents);

      return () => {
        socket.off('incident:created', fetchIncidents);
        socket.off('incident:updated', fetchIncidents);
      };
    }
  }, [socket]);

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Incident Manager
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Track, triage, and resolve production service disruptions with strict state machines.
          </p>
        </div>
        <button onClick={onOpenDeclare} className="btn btn-primary">
          <Plus size={16} />
          <span>Declare Incident</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn btn-sm"
              style={{
                background: statusFilter === st ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: statusFilter === st ? 'var(--brand-primary)' : 'var(--border-subtle)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                fontWeight: statusFilter === st ? 600 : 500,
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search & Severity Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '150px', padding: '6px 10px', fontSize: '0.8rem' }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="P1 - Critical">P1 - Critical</option>
            <option value="P2 - High">P2 - High</option>
            <option value="P3 - Medium">P3 - Medium</option>
            <option value="P4 - Low">P4 - Low</option>
          </select>

          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search incidents..."
              className="form-input"
              style={{ paddingLeft: '32px', width: '220px', padding: '6px 12px 6px 32px', fontSize: '0.8rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.725rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Incident ID</th>
              <th style={{ padding: '12px 16px' }}>Severity</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Title & Summary</th>
              <th style={{ padding: '12px 16px' }}>Service</th>
              <th style={{ padding: '12px 16px' }}>Commander</th>
              <th style={{ padding: '12px 16px' }}>Triggered</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No incidents match the selected filter criteria.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr 
                  key={inc._id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 700 }} className="font-mono">
                    <span style={{ color: 'var(--brand-primary)' }}>{inc.incidentNumber}</span>
                    {inc.alertCount > 1 && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#fbbf24', marginTop: '2px' }}>
                        ⚡ {inc.alertCount} alerts
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={inc.status} />
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: '360px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                      {inc.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.summary}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {inc.serviceName}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                    {inc.commanderName || 'Unassigned'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(inc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => onNavigate(`war-room-${inc._id}`)}
                      className="btn btn-secondary btn-sm"
                    >
                      <span>War Room</span>
                      <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
