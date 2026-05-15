import React, { useEffect, useState } from 'react';
import type { AuthUser, UserProfile } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';

interface UserSettingsPageProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({ currentUser, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.settings.me()
      .then(setProfile)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      await api.settings.changePassword({ current_password: currentPassword, new_password: newPassword });
      setMessage('Password updated. Please log in again.');
      window.setTimeout(() => onLogout(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MCAKingLoader label="Loading settings..." centered />;

  const displayProfile = profile ?? {
    id: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    full_name: currentUser.full_name ?? currentUser.name ?? null,
    is_disabled: false,
    disabled_at: null,
    closed_at: null,
    last_login_at: null,
    created_at: '',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-main ">User Settings</h2>
        <p className="mt-1 text-sm text-muted">Manage your password. Email and role changes are admin-only.</p>
      </div>

      {error && <div className="rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger dark:bg-danger/20 dark:text-danger">{error}</div>}
      {message && <div className="rounded-md bg-success/10 p-3 text-sm font-semibold text-success dark:bg-success/20 dark:text-success">{message}</div>}

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-black text-main ">My Account</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadOnlyField label="Email Address" value={displayProfile.email} />
            <ReadOnlyField label="Role" value={displayProfile.role.replace('_', ' ')} />
            <ReadOnlyField label="Full Name" value={displayProfile.full_name ?? 'N/A'} />
            <ReadOnlyField label="Member Since" value={formatDate(displayProfile.created_at)} />
            <ReadOnlyField label="Last Login" value={formatDate(displayProfile.last_login_at)} />
          </div>
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm font-semibold text-warning dark:border-warning/40 dark:bg-warning/20 dark:text-warning">
            Email, role, and account-status changes must be handled by an admin.
          </p>
        </div>
      </Card>

      <Card>
        <form onSubmit={changePassword} className="p-6">
          <h3 className="text-lg font-black text-main ">Change Password</h3>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <Input label="Current Password" name="current_password" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
            <Input label="New Password" name="new_password" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={8} />
            <Input label="Confirm New Password" name="confirm_password" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} />
          </div>
          <div className="mt-5 flex justify-end">
            <PrimaryButton type="submit" label={saving ? 'Saving...' : 'Change Password'} disabled={saving} />
          </div>
        </form>
      </Card>
    </div>
  );
};

const ReadOnlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <label className="block">
    <span className="text-sm font-medium text-main">{label}</span>
    <input value={value} readOnly className="mt-1 block w-full cursor-not-allowed rounded-md border-0 px-3 py-2 text-main ring-1 ring-inset ring-line -muted  ring-line" />
  </label>
);
