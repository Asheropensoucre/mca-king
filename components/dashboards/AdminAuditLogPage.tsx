import React, { useEffect, useState } from 'react';
import type { AuditLog, PaginatedResponse } from '../../types';
import { api } from '../../src/lib/api-client';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../src/components/ui/MCAKingLoader';

const fmt = (value: string | null | undefined): string => value ? new Date(value).toLocaleString() : '—';

const summarizeUserAgent = (value: string | null | undefined): string => {
  if (!value) return '—';
  if (value.length <= 70) return value;
  return `${value.slice(0, 70)}…`;
};

const metadataPreview = (metadata: Record<string, unknown>): string => {
  const text = JSON.stringify(metadata ?? {});
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};

export const AdminAuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', entity_type: '', user_id: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<AuditLog> = await api.auditLogs.list({ ...filters, page: nextPage, per_page: 25 });
      setLogs(response.data);
      setTotal(response.total);
      setPage(response.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); }, []);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <Card>
      <div className="p-6">
        <div className="mb-5">
          <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Audit Logs</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Admin-only security trail. Logs are read-only and sensitive metadata is redacted.</p>
        </div>

        <form onSubmit={event => { event.preventDefault(); void load(1); }} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input label="Action" value={filters.action} onChange={event => setFilters({ ...filters, action: event.target.value })} placeholder="document.uploaded" />
          <Input label="Entity Type" value={filters.entity_type} onChange={event => setFilters({ ...filters, entity_type: event.target.value })} placeholder="merchant" />
          <Input label="User ID" value={filters.user_id} onChange={event => setFilters({ ...filters, user_id: event.target.value })} />
          <Input label="From" type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} />
          <Input label="To" type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} />
          <div className="md:col-span-5 flex justify-end gap-2">
            <PrimaryButton label="Reset" size="small" variant="danger" onClick={() => { setFilters({ action: '', entity_type: '', user_id: '', from: '', to: '' }); setPage(1); void api.auditLogs.list({ page: 1, per_page: 25 }).then(response => { setLogs(response.data); setTotal(response.total); }); }} />
            <PrimaryButton type="submit" label="Search Logs" size="small" />
          </div>
        </form>

        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {loading ? <MCAKingLoader label="Loading audit logs..." size="small" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-950/90">
                <tr className="text-left text-xs font-black uppercase tracking-wider text-theme-yellow">
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Entity</th>
                  <th className="px-3 py-3">IP</th>
                  <th className="px-3 py-3">User Agent</th>
                  <th className="px-3 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {logs.length > 0 ? logs.map(log => (
                  <tr key={log.id}>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{fmt(log.created_at)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-900 dark:text-slate-100">{log.user_name ?? log.user_email ?? log.user_id ?? 'System'}</td>
                    <td className="px-3 py-3 text-xs font-black text-theme-maroon dark:text-theme-yellow">{log.action}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{log.entity_type ?? '—'}<br />{log.entity_id ?? ''}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{log.ip_address ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{summarizeUserAgent(log.user_agent)}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300"><code>{metadataPreview(log.metadata)}</code></td>
                  </tr>
                )) : <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">No audit logs found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-3 text-sm font-black text-theme-maroon dark:text-theme-yellow">
          <PrimaryButton label="Previous" size="small" disabled={page <= 1} onClick={() => void load(Math.max(1, page - 1))} />
          <span>Page {page} of {totalPages}</span>
          <PrimaryButton label="Next" size="small" disabled={page >= totalPages} onClick={() => void load(Math.min(totalPages, page + 1))} />
        </div>
      </div>
    </Card>
  );
};
