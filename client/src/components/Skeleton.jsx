import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="flex gap-3 mt-3">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-12" />
        <div className="h-3 bg-gray-100 rounded w-14" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="w-9 h-9 bg-gray-100 rounded-xl mb-4" />
      <div className="h-6 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-24" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-100" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded flex-1" />
          <div className="h-4 bg-gray-100 rounded w-20" />
          <div className="h-4 bg-gray-100 rounded w-16" />
          <div className="h-4 bg-gray-50 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 space-y-5">
      <div className="h-7 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonStat key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonTable rows={4} />
        <SkeletonTable rows={4} />
      </div>
    </div>
  );
}

export function SkeletonClients() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-9 bg-gray-100 rounded-xl w-28 animate-pulse" />
      </div>
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      <div className="hidden md:block"><SkeletonTable rows={6} /></div>
      <div className="md:hidden space-y-3">
        {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
