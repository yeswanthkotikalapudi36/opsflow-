import React from 'react';
import { AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';

export default function SeverityBadge({ severity }) {
  const s = severity || 'P3 - Medium';

  if (s.startsWith('P1')) {
    return (
      <span className="badge badge-p1" title="P1 - Critical: Immediate response required. Complete service outage.">
        <AlertCircle size={13} />
        {s}
      </span>
    );
  }

  if (s.startsWith('P2')) {
    return (
      <span className="badge badge-p2" title="P2 - High: Severe degradation affecting major customers.">
        <AlertTriangle size={13} />
        {s}
      </span>
    );
  }

  if (s.startsWith('P3')) {
    return (
      <span className="badge badge-p3" title="P3 - Medium: Moderate impact with workaround available.">
        <Info size={13} />
        {s}
      </span>
    );
  }

  return (
    <span className="badge badge-p4" title="P4 - Low: Minor issue or non-urgent alert.">
      <Bell size={13} />
      {s}
    </span>
  );
}
