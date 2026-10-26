import React from 'react';

export default function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();

  let badgeClass = 'badge-p4';
  let dotClass = 'pulse-dot';
  let label = s;

  if (s === 'TRIGGERED') {
    badgeClass = 'badge-p1';
    dotClass = 'pulse-dot dot-critical';
    label = 'Triggered';
  } else if (s === 'ACKNOWLEDGED') {
    badgeClass = 'badge-p2';
    dotClass = 'pulse-dot dot-critical';
    label = 'Acknowledged';
  } else if (s === 'INVESTIGATING') {
    badgeClass = 'badge-p2';
    dotClass = 'pulse-dot dot-critical';
    label = 'Investigating';
  } else if (s === 'IDENTIFIED') {
    badgeClass = 'badge-p3';
    label = 'Identified';
  } else if (s === 'MONITORING') {
    badgeClass = 'badge-p3';
    label = 'Monitoring';
  } else if (s === 'RESOLVED') {
    badgeClass = 'badge-operational';
    dotClass = 'pulse-dot dot-operational';
    label = 'Resolved';
  } else if (s === 'OPERATIONAL') {
    badgeClass = 'badge-operational';
    dotClass = 'pulse-dot dot-operational';
    label = 'Operational';
  } else if (s === 'DEGRADED') {
    badgeClass = 'badge-degraded';
    label = 'Degraded';
  } else if (s === 'MAJOR_OUTAGE' || s === 'MAJOR OUTAGE') {
    badgeClass = 'badge-outage';
    dotClass = 'pulse-dot dot-critical';
    label = 'Major Outage';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span className={dotClass} />
      {label}
    </span>
  );
}
