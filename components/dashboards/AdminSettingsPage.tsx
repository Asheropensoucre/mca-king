import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, UserProfile, UserRole } from '../../types';
import { api } from '../../src/lib/api-client';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../src/components/ui/MCAKingLoader';
import { AdminAuditLogPage } from './AdminAuditLogPage';

interface AdminSettingsPageProps {
  currentUser: AuthUser;
  onSalesRepCreated: (rep: { id: string; email: string; name: string }) => void;
}

type AdminSettingsTab = 'users' | 'create_rep' | 'audit_logs';
type UserAction = 'email' | 'reset' | 'disable' | 'close' | null;

function formatDate(value: string | null): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function statusFor(user: UserProfile): 'Closed' | 'Disabled' | 'Active' {
  if (user.closed_at) return 'Closed';
  if (user.is_disabled) return 'Disabled';
  return 'Active';
}

const roleOptions: Array<{ value: UserRole | ''; label: string }> = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'lender', label: 'Lender/Funder' },
];

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ currentUser, onSalesRepCreated }) => {
  const [tab, setTab] = useState<AdminSettingsTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [action, setAction] = useState<UserAction>(null);
  const [modalValue, setModalValue] = useState('');
  const [reason, setReason] = useState('');
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '' });

  const isCurrentUserAdmin = currentUser.role === 'admin';

  const loadUsers = async () => {
    if (!isCurrentUserAdmin) return;
    try {
      setError(null);
      setLoading(true);
      const params = {
        role,
        search,
        ...(status === 'active' ? { is_disabled: 'false' } : {}),
        ...(status === 'disabled' ? { is_disabled: 'true' } : {}),
        ...(status === 'closed' ? { status: 'closed' } : {}),
      };
      setUsers(await api.adminUsers.list(params));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, [role, status]);

  const filteredUsers = useMemo(() => users, [users]);

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void loadUsers();
  };

  const openAction = (user: UserProfile, nextAction: UserAction) => {
    setSelectedUser(user);
    setAction(nextAction);
    setModalValue(nextAction === 'email' ? user.email : '');
    setReason('');
    setError(null);
    setMessage(null);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setAction(null);
    setModalValue('');
    setReason('');
  };

  const submitAction = async () => {
    if (!selectedUser || !action) return;
    try {
      setError(null);
      if (action === 'email') {
        const updated = await api.adminUsers.update(selectedUser.id, { email: modalValue });
        setUsers(prev => prev.map(user => user.id === updated.id ? updated : user));
        setMessage('Email updated.');
      }
      if (action === 'reset') {
        await api.adminUsers.resetPassword(selectedUser.id, modalValue);
        setMessage('Password reset. User must log in again.');
      }
      if (action === 'disable') {
        await api.adminUsers.disable(selectedUser.id, reason);
        setMessage('Account disabled.');
        await loadUsers();
      }
      if (action === 'close') {
        await api.adminUsers.close(selectedUser.id, reason);
        setMessage('Account closed. CRM history was preserved.');
        await loadUsers();
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const reactivate = async (user: UserProfile) => {
    try {
      await api.adminUsers.reactivate(user.id);
      setMessage('Account reactivated.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reactivate account.');
    }
  };

  const updateRole = async (user: UserProfile, nextRole: UserRole) => {
    if (!confirm(`Change ${user.email} role to ${nextRole}? This revokes their sessions.`)) return;
    try {
      const updated = await api.adminUsers.update(user.id, { role: nextRole });
      setUsers(prev => prev.map(item => item.id === updated.id ? updated : item));
      setMessage('Role updated and sessions revoked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role.');
    }
  };

  const createSalesRep = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (createForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      const created = await api.adminUsers.createSalesRep(createForm);
      setMessage(`Sales rep created: ${created.full_name ?? created.email}`);
      onSalesRepCreated({ id: created.id, email: created.email, name: created.full_name ?? created.email });
      setCreateForm({ full_name: '', email: '', password: '' });
      setTab('users');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sales rep.');
    }
  };

  if (!isCurrentUserAdmin) return <Card className="p-6 text-sm text-red-600">Admin settings are admin-only.</Card>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">Admin Settings</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage broker-shop user accounts. Normal users can only change their own password.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      {message && <div className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</div>}

      <div className="flex flex-wrap gap-2">
        <PrimaryButton label="User Management" size="small" variant={tab === 'users' ? 'funded' : 'default'} onClick={() => setTab('users')} />
        <PrimaryButton label="Create Sales Rep" size="small" variant={tab === 'create_rep' ? 'funded' : 'default'} onClick={() => setTab('create_rep')} />
        <PrimaryButton label="Audit Logs" size="small" variant={tab === 'audit_logs' ? 'funded' : 'default'} onClick={() => setTab('audit_logs')} />
      </div>

      {tab === 'users' && (
        <Card>
          <div className="p-6">
            <form onSubmit={runSearch} className="mb-5 flex flex-wrap items-end gap-3">
              <label className="text-xs font-black uppercase tracking-wider text-theme-teal">
                Role
                <select value={role} onChange={event => setRole(event.target.value as UserRole | '')} className="mt-1 block rounded-md border px-3 py-2 text-sm dark:bg-slate-900">
                  {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-wider text-theme-teal">
                Status
                <select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 block rounded-md border px-3 py-2 text-sm dark:bg-slate-900">
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="min-w-64 flex-1 text-xs font-black uppercase tracking-wider text-theme-teal">
                Search
                <input value={search} onChange={event => setSearch(event.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm dark:bg-slate-900" placeholder="Name or email" />
              </label>
              <PrimaryButton type="submit" label="Search" size="small" />
            </form>

            {loading ? <MCAKingLoader label="Loading users..." size="small" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-black uppercase tracking-wider text-theme-yellow">
                      <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => {
                      const isProtectedAdmin = user.role === 'admin' && user.id !== currentUser.id;
                      return (
                        <tr key={user.id} className="bg-slate-50 dark:bg-slate-900/50">
                          <td className="px-3 py-3 text-sm font-black text-theme-maroon dark:text-theme-yellow">{user.full_name ?? 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                          <td className="px-3 py-3 text-sm">
                            <select value={user.role} onChange={event => updateRole(user, event.target.value as UserRole)} disabled={user.closed_at !== null || user.id === currentUser.id} className="rounded-md border px-2 py-1 text-xs font-bold dark:bg-slate-900">
                              {roleOptions.filter(option => option.value).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-sm"><StatusBadge status={statusFor(user)} /></td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(user.last_login_at)}</td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(user.created_at)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <PrimaryButton label="Email" size="small" onClick={() => openAction(user, 'email')} disabled={user.closed_at !== null} />
                              <PrimaryButton label="Reset" size="small" onClick={() => openAction(user, 'reset')} disabled={user.closed_at !== null} />
                              {user.is_disabled && !user.closed_at ? <PrimaryButton label="Reactivate" size="small" variant="funded" onClick={() => void reactivate(user)} /> : null}
                              {!user.is_disabled && <PrimaryButton label="Disable" size="small" variant="danger" disabled={isProtectedAdmin || user.id === currentUser.id} onClick={() => openAction(user, 'disable')} />}
                              {!user.closed_at && <PrimaryButton label="Close" size="small" variant="danger" disabled={isProtectedAdmin || user.id === currentUser.id} onClick={() => openAction(user, 'close')} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'audit_logs' && <AdminAuditLogPage />}

      {tab === 'create_rep' && (
        <Card>
          <form onSubmit={createSalesRep} className="p-6">
            <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Create Sales Rep</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This creates an internal broker-shop sales rep login.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Full Name" name="full_name" value={createForm.full_name} onChange={event => setCreateForm({ ...createForm, full_name: event.target.value })} required />
              <Input label="Email" name="email" type="email" value={createForm.email} onChange={event => setCreateForm({ ...createForm, email: event.target.value })} required />
              <Input label="Temporary Password" name="password" type="password" value={createForm.password} onChange={event => setCreateForm({ ...createForm, password: event.target.value })} required minLength={8} />
            </div>
            <div className="mt-5 flex justify-end"><PrimaryButton type="submit" label="Create Sales Rep" /></div>
          </form>
        </Card>
      )}

      {selectedUser && action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">{actionTitle(action)}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">User: {selectedUser.email}</p>
              {action === 'email' && <Input label="New Email" name="email" type="email" value={modalValue} onChange={event => setModalValue(event.target.value)} />}
              {action === 'reset' && <Input label="Temporary Password" name="password" type="password" value={modalValue} onChange={event => setModalValue(event.target.value)} minLength={8} />}
              {(action === 'disable' || action === 'close') && <Textarea label="Reason" name="reason" value={reason} onChange={event => setReason(event.target.value)} />}
              {action === 'close' && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">This cannot be undone from the user side. CRM history will be preserved.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t p-4 dark:border-slate-700">
              <PrimaryButton label="Cancel" size="small" variant="danger" onClick={closeModal} />
              <PrimaryButton label="Confirm" size="small" onClick={() => void submitAction()} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: 'Closed' | 'Disabled' | 'Active' }> = ({ status }) => {
  const classes = status === 'Active'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
    : status === 'Disabled'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${classes}`}>{status}</span>;
};

function actionTitle(action: Exclude<UserAction, null>): string {
  if (action === 'email') return 'Change Email';
  if (action === 'reset') return 'Reset Password';
  if (action === 'disable') return 'Disable Account';
  return 'Close Account';
}
