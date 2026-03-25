import React from 'react';

const CONFIG = {
  'Missing':        'bg-red-50 text-red-500 border border-red-200',
  'Requested':      'bg-amber-50 text-amber-600 border border-amber-200',
  'Uploaded':       'bg-blue-50 text-blue-500 border border-blue-200',
  'Under Review':   'bg-purple-50 text-purple-500 border border-purple-200',
  'Approved':       'bg-green-50 text-green-600 border border-green-200',
  'Rejected':       'bg-red-50 text-red-600 border border-red-200',
  'Needs Reupload': 'bg-orange-50 text-orange-500 border border-orange-200',
  'Active':         'bg-green-50 text-green-600 border border-green-200',
  'Pending':        'bg-amber-50 text-amber-600 border border-amber-200',
  'Completed':      'bg-green-50 text-green-600 border border-green-200',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cls = CONFIG[status] || 'bg-apple-gray8 text-apple-gray3 border border-apple-gray7';
  const pad = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${pad} ${cls}`}>
      {status}
    </span>
  );
}
