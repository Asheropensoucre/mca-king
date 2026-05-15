import React, { useEffect, useState } from 'react';
import type { AuthUser, Lead, LeadStatus, SalesRepresentative, PaginatedResponse } from '../../types';
import { api } from '../../src/lib/api-client';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ActivityTimeline } from './shared/ActivityTimeline';
import { TaskPanel } from './shared/TaskPanel';
import { CommunicationHistoryPanel } from './shared/communications/CommunicationHistoryPanel';
import { CommunicationPreferencesPanel } from './shared/communications/CommunicationPreferencesPanel';
import { ManualEmailModal } from './shared/communications/ManualEmailModal';
import { FilterBar } from './shared/FilterBar';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'docs_requested', label: 'Docs Requested' },
  { value: 'dead', label: 'Dead' },
];

const statusClasses: Record<LeadStatus, string> = {
  new: 'bg-surface-muted text-main  ',
  contacted: 'bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary',
  docs_requested: 'bg-warning/15 text-warning dark:bg-warning/25 dark:text-warning',
  converted: 'bg-success/15 text-success dark:bg-success/25 dark:text-success',
  dead: 'bg-danger/15 text-danger dark:bg-danger/25 dark:text-danger',
};

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface LeadManagerProps {
  isAdmin: boolean;
  salesReps: SalesRepresentative[];
  onConverted?: (merchantId: string) => void;
  currentUser: AuthUser;
  initialLeadId?: string | null;
}

export const LeadManager: React.FC<LeadManagerProps> = ({ isAdmin, salesReps, onConverted, currentUser, initialLeadId }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [communicationRefreshKey, setCommunicationRefreshKey] = useState(0);
  const [showNewForm, setShowNewForm] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [form, setForm] = useState({ business_name: '', owner_name: '', phone: '', email: '', state: '', assigned_rep_id: '', initial_note: '' });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = async () => {
    try {
      setError(null);
      const response = await api.leads.listFiltered({ ...filters, page, per_page: 24 });
      setLeads(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load leads');
    }
  };

  useEffect(() => { void loadLeads(); }, [filters, page]);

  useEffect(() => {
    if (!initialLeadId) return;
    api.leads.get(initialLeadId).then(setSelectedLead).catch(err => setError(err instanceof Error ? err.message : 'Could not open lead'));
  }, [initialLeadId]);

  const openLead = async (lead: Lead) => {
    setSelectedLead(await api.leads.get(lead.id));
  };

  const createLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.leads.create({ ...form, assigned_rep_id: form.assigned_rep_id || null });
    setForm({ business_name: '', owner_name: '', phone: '', email: '', state: '', assigned_rep_id: '', initial_note: '' });
    setShowNewForm(false);
    await loadLeads();
  };

  const updateLead = async (patch: Partial<Lead>) => {
    if (!selectedLead) return;
    const updated = await api.leads.update({ ...patch, id: selectedLead.id });
    setSelectedLead({ ...selectedLead, ...updated });
    await loadLeads();
  };

  const addNote = async () => {
    if (!selectedLead || !noteBody.trim()) return;
    await api.leads.addNote(selectedLead.id, noteBody);
    setNoteBody('');
    await openLead(selectedLead);
    await loadLeads();
  };

  const convertLead = async () => {
    if (!selectedLead || !confirm('Convert this lead to a merchant?')) return;
    const result = await api.leads.convert(selectedLead.id);
    setSelectedLead(null);
    await loadLeads();
    onConverted?.(result.merchant_id);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-main ">Leads</h2>
          <p className="text-sm text-muted">Track prospects before they become merchant applications.</p>
        </div>
        <PrimaryButton label="New Lead" size="small" onClick={() => setShowNewForm(true)} />
      </div>
      <FilterBar entityType="leads" filters={filters} onFilterChange={(next) => { setFilters(next); setPage(1); }} onReset={() => { setFilters({}); setPage(1); }} salesReps={salesReps} isAdmin={isAdmin} currentUserRole={currentUser.role} />
      {error && <div className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leads.map(lead => (
          <button key={lead.id} onClick={() => void openLead(lead)} className="text-left focus:outline-none focus:ring-2 focus:ring-secondary rounded-lg">
            <Card className="p-5 h-full hover:border-secondary/70 transition-colors">
              <div className="flex justify-between gap-3 items-start">
                <h3 className="text-lg font-black text-main ">{lead.business_name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[lead.status]}`}>{lead.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-2 text-sm text-muted">Owner: {lead.owner_name || 'N/A'}</p>
              <p className="text-sm text-muted">State: {lead.state || 'N/A'}</p>
              <div className="mt-2 text-sm">
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="text-secondary hover:text-secondary/80 block">{lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="text-secondary hover:text-secondary/80 block">{lead.email}</a>}
              </div>
              {lead.latest_note && <p className="mt-3 text-xs text-muted">“{lead.latest_note.body.slice(0, 80)}” — {lead.latest_note.author_name || 'Unknown'}, {timeAgo(lead.latest_note.created_at)}</p>}
            </Card>
          </button>
        ))}
        {leads.length === 0 && <Card className="p-8 text-center text-sm text-muted md:col-span-2 xl:col-span-3">No leads yet.</Card>}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 text-sm font-black text-main ">
        <PrimaryButton label="Previous" size="small" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))} />
        <span>Page {page} of {Math.max(1, Math.ceil(total / 24))}</span>
        <PrimaryButton label="Next" size="small" disabled={page >= Math.max(1, Math.ceil(total / 24))} onClick={() => setPage(Math.min(Math.max(1, Math.ceil(total / 24)), page + 1))} />
      </div>

      {(showNewForm || selectedLead) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {showNewForm ? (
              <form onSubmit={createLead}>
                <div className="p-6 border-b border-line"><h3 className="text-lg font-black text-main ">New Lead</h3></div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Business Name" name="business_name" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} required />
                  <Input label="Owner Name" name="owner_name" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
                  <Input label="Phone" name="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  <Input label="Email" name="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  <label className="block"><span className="text-sm font-medium text-main">State</span><select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-main ring-1 ring-inset ring-line   ring-line"><option value="">Select</option>{STATES.map(state => <option key={state} value={state}>{state}</option>)}</select></label>
                  {isAdmin && <label className="block"><span className="text-sm font-medium text-main">Assign Rep</span><select value={form.assigned_rep_id} onChange={e => setForm({ ...form, assigned_rep_id: e.target.value })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-main ring-1 ring-inset ring-line   ring-line"><option value="">Unassigned</option>{salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>}
                  <div className="sm:col-span-2"><Textarea label="Initial Note" name="initial_note" value={form.initial_note} onChange={e => setForm({ ...form, initial_note: e.target.value })} /></div>
                </div>
                <div className="p-4 bg-surface-muted -muted/50 border-t flex justify-end gap-2"><PrimaryButton label="Cancel" size="small" variant="danger" onClick={() => setShowNewForm(false)} /><PrimaryButton type="submit" label="Save Lead" size="small" /></div>
              </form>
            ) : selectedLead && (
              <div>
                {showEmailModal && (
                  <ManualEmailModal entityType="lead" entityId={selectedLead.id} defaultTo={selectedLead.email} onClose={() => setShowEmailModal(false)} onSent={() => setCommunicationRefreshKey(key => key + 1)} />
                )}
                <div className="p-6 border-b border-line flex justify-between"><h3 className="text-lg font-black text-main ">{selectedLead.business_name}</h3><button onClick={() => setSelectedLead(null)} className="text-sm text-secondary">Close</button></div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Business Name" name="business_name" value={selectedLead.business_name} onChange={e => setSelectedLead({ ...selectedLead, business_name: e.target.value })} onBlur={() => void updateLead({ business_name: selectedLead.business_name })} />
                    <Input label="Owner Name" name="owner_name" value={selectedLead.owner_name || ''} onChange={e => setSelectedLead({ ...selectedLead, owner_name: e.target.value })} onBlur={() => void updateLead({ owner_name: selectedLead.owner_name })} />
                    <Input label="Phone" name="phone" value={selectedLead.phone || ''} onChange={e => setSelectedLead({ ...selectedLead, phone: e.target.value })} onBlur={() => void updateLead({ phone: selectedLead.phone })} />
                    <Input label="Email" name="email" value={selectedLead.email || ''} onChange={e => setSelectedLead({ ...selectedLead, email: e.target.value })} onBlur={() => void updateLead({ email: selectedLead.email })} />
                    <label className="block"><span className="text-sm font-medium text-main">Status</span><select value={selectedLead.status} disabled={selectedLead.status === 'converted'} onChange={e => void updateLead({ status: e.target.value as LeadStatus })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-main ring-1 ring-inset ring-line   ring-line">{selectedLead.status === 'converted' && <option value="converted">Converted</option>}{STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                    {isAdmin && <label className="block"><span className="text-sm font-medium text-main">Assign Rep</span><select value={selectedLead.assigned_rep_id || ''} onChange={e => void updateLead({ assigned_rep_id: e.target.value || null })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-main ring-1 ring-inset ring-line   ring-line"><option value="">Unassigned</option>{salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton disabled={selectedLead.status === 'converted'} label={selectedLead.status === 'converted' ? 'Already Converted' : 'Convert to Merchant'} onClick={() => void convertLead()} />
                    <PrimaryButton label="Send Email" onClick={() => setShowEmailModal(true)} />
                  </div>
                  <CommunicationPreferencesPanel entityType="lead" entityId={selectedLead.id} defaultEmail={selectedLead.email} defaultPhone={selectedLead.phone} />
                  <CommunicationHistoryPanel key={communicationRefreshKey} entityType="lead" entityId={selectedLead.id} />
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <ActivityTimeline entityType="lead" entityId={selectedLead.id} currentUserRole={currentUser.role} />
                    <TaskPanel entityType="lead" entityId={selectedLead.id} currentUser={currentUser} />
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm font-black text-secondary">Legacy lead notes</summary>
                    <div className="mt-3"><h4 className="font-black text-main  mb-2">Notes</h4><div className="space-y-2 max-h-52 overflow-y-auto">{selectedLead.notes?.map(note => <div key={note.id} className="p-3 rounded-md bg-surface-muted -muted"><p className="text-sm text-main">{note.body}</p><p className="text-xs text-muted mt-1">{note.author_name || 'Unknown'} • {new Date(note.created_at).toLocaleString()}</p></div>)}</div></div>
                    <Textarea label="Add Note" name="note" value={noteBody} onChange={e => setNoteBody(e.target.value)} />
                    <div className="flex justify-end"><PrimaryButton label="Add Note" size="small" variant="funded" onClick={() => void addNote()} /></div>
                  </details>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
