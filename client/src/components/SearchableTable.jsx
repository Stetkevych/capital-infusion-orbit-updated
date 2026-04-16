import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Edit3, Check, X } from 'lucide-react';

/**
 * SearchableTable — reusable table with sort, search, pagination, inline edit.
 * 
 * Props:
 *   columns: [{ key, label, sortable?, editable?, type?: 'text'|'number'|'select', options?: [] }]
 *   data: [{ id, ...fields }]
 *   onEdit?: (rowId, field, oldValue, newValue) => void
 *   corrections?: { [rowId_field]: correctedValue }  // overlay corrections
 *   pageSize?: number
 *   title?: string
 *   collapsible?: boolean
 */
export default function SearchableTable({
  columns = [], data = [], onEdit, corrections = {},
  pageSize = 50, title, collapsible = true,
}) {
  const [search, setSearch] = useState('');
  const [colFilters, setColFilters] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null); // { rowId, field }
  const [editValue, setEditValue] = useState('');
  const [open, setOpen] = useState(true);

  // Apply corrections overlay
  const correctedData = useMemo(() => data.map(row => {
    const corrected = { ...row, _corrections: {} };
    columns.forEach(col => {
      const key = `${row.id}_${col.key}`;
      if (corrections[key] !== undefined) {
        corrected[col.key] = corrections[key];
        corrected._corrections[col.key] = true;
      }
    });
    return corrected;
  }), [data, corrections, columns]);

  // Filter
  const filtered = useMemo(() => {
    return correctedData.filter(row => {
      if (search) {
        const s = search.toLowerCase();
        const match = columns.some(c => String(row[c.key] ?? '').toLowerCase().includes(s));
        if (!match) return false;
      }
      for (const [key, val] of Object.entries(colFilters)) {
        if (val && !String(row[key] ?? '').toLowerCase().includes(val.toLowerCase())) return false;
      }
      return true;
    });
  }, [correctedData, search, colFilters, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const startEdit = (rowId, field, currentValue) => {
    setEditing({ rowId, field });
    setEditValue(String(currentValue ?? ''));
  };

  const saveEdit = () => {
    if (editing && onEdit) {
      const row = data.find(r => r.id === editing.rowId);
      const oldValue = row?.[editing.field];
      if (String(oldValue) !== editValue) {
        onEdit(editing.rowId, editing.field, oldValue, editValue);
      }
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/30";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {title && (
        <button onClick={() => collapsible && setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
          <h3 className="text-gray-900 font-semibold text-sm">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">{sorted.length} rows</span>
            {collapsible && (open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />)}
          </div>
        </button>
      )}
      {open && (
        <>
          {/* Global search */}
          <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-2">
            <Search size={13} className="text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search all columns..." className="flex-1 text-xs text-gray-700 bg-transparent outline-none" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                {/* Column headers */}
                <tr className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                  {columns.map(col => (
                    <th key={col.key} className="text-left py-2 px-3 text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {col.sortable !== false ? (
                          <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-gray-800">
                            {col.label}
                            {sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                          </button>
                        ) : col.label}
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Column filters */}
                <tr className="border-b border-gray-100">
                  {columns.map(col => (
                    <th key={col.key} className="px-3 py-1">
                      <input value={colFilters[col.key] || ''} onChange={e => { setColFilters(f => ({ ...f, [col.key]: e.target.value })); setPage(0); }}
                        placeholder="Filter..." className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-500/30" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={columns.length} className="text-center py-6 text-gray-400">No data</td></tr>
                ) : paged.map(row => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {columns.map(col => {
                      const isCorrected = row._corrections?.[col.key];
                      const isEditing = editing?.rowId === row.id && editing?.field === col.key;
                      const val = row[col.key];

                      return (
                        <td key={col.key} className={`py-1.5 px-3 whitespace-nowrap ${isCorrected ? 'bg-amber-50' : ''}`}>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              {col.type === 'select' ? (
                                <select value={editValue} onChange={e => setEditValue(e.target.value)} className={inputCls}>
                                  {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input type={col.type === 'number' ? 'number' : 'text'} value={editValue}
                                  onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                  className={inputCls} autoFocus />
                              )}
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><Check size={12} /></button>
                              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className={`${isCorrected ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>
                                {typeof val === 'number' ? val.toLocaleString() : (val ?? '—')}
                              </span>
                              {col.editable && onEdit && (
                                <button onClick={() => startEdit(row.id, col.key, val)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity">
                                  <Edit3 size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
              <span className="text-gray-400 text-xs">Page {page + 1} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 px-2 py-1">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 px-2 py-1">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
