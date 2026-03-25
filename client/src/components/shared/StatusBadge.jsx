import React from 'react';

const CONFIG = {
  'Missing':        'bg-red-900/40 text-red-400 border border-red-800',
  'Requested':      'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  'Uploaded':       'bg-blue-900/40 text-blue-400 border border-blue-800',
  'Under Review':   'bg-purple-900/40 text-purple-400 border border-purple-800',
  'Approved':       'bg-green-900/40 text-green-400 border border-green-800',
  'Rejected':       'bg-red-900/60 text-red-300 border border-red-700',
  'Needs Reupload': 'bg-orange-900/40 text-orange-400 border border-orange-800',
  'Active':         'bg-green-900/40 text-green-400 border border-green-800',
  'Pending':        'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  'Completed':      'bg-green-900/40 text-green-400 border border-green-800',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cls = CONFIG[status] || 'bg-slate-700 text-slate-300 border border-slate-600';
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded font-medium ${pad} ${cls}`}>
      {status}
    </span>
  );
}
