import React from 'react';

const CONFIG = {
  'Missing':        'bg-red-50 text-red-500 border-red-100',
  'Requested':      'bg-amber-50 text-amber-600 border-amber-100',
  'Uploaded':       'bg-blue-50 text-blue-600 border-blue-100',
  'Under Review':   'bg-purple-50 text-purple-600 border-purple-100',
  'Approved':       'bg-green-50 text-green-600 border-green-100',
  'Rejected':       'bg-red-50 text-red-600 border-red-100',
  'Needs Reupload': 'bg-orange-50 text-orange-500 border-orange-100',
  'Active':         'bg-green-50 text-green-600 border-green-100',
  'Pending':        'bg-amber-50 text-amber-600 border-amber-100',
  'Completed':      'bg-green-50 text-green-600 border-green-100',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cls = CONFIG[status] || 'bg-gray-50 text-gray-500 border-gray-100';
  const pad = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${pad} ${cls}`}>
      {status}
    </span>
  );
}
