import React, { useEffect, useState } from 'react';
import type { Lead, LeadStatus, SalesRepresentative } from '../../types';
import { api } from '../../src/lib/api-client';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'docs_requested', label: 'Docs Requested' },
  { value: 'dead', label: 'Dead' },
];

const statusClasses: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  contacted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  docs_requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  dead: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
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
}

export const LeadManager: React.FC<LeadManagerProps> = ({ isAdmin, salesReps, onConverted }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [form, setForm] = useState({ business_name: '', owner_name: '', phone: '', email: '', state: '', assigned_rep_id: '', initial_note: '' });
  const [error, setError] = useState<string | null>(null);

  const loadLeads = async () => {
    try {
      setError(null);
      setLeads(await api.leads.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load leads');
    }
  };

  useEffect(() => { void loadLeads(); }, []);

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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Leads</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track prospects before they become merchant applications.</p>
        </div>
        <button onClick={() => setShowNewForm(true)} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">New Lead</button>
      </div>
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leads.map(lead => (
          <button key={lead.id} onClick={() => void openLead(lead)} className="text-left focus:outline-none focus:ring-2 focus:ring-theme-teal rounded-lg">
            <Card className="p-5 h-full hover:border-theme-teal/70 transition-colors">
              <div className="flex justify-between gap-3 items-start">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{lead.business_name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[lead.status]}`}>{lead.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Owner: {lead.owner_name || 'N/A'}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">State: {lead.state || 'N/A'}</p>
              <div className="mt-2 text-sm">
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="text-theme-teal hover:text-theme-teal/80 block">{lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="text-theme-teal hover:text-theme-teal/80 block">{lead.email}</a>}
              </div>
              {lead.latest_note && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">“{lead.latest_note.body.slice(0, 80)}” — {lead.latest_note.author_name || 'Unknown'}, {timeAgo(lead.latest_note.created_at)}</p>}
            </Card>
          </button>
        ))}
        {leads.length === 0 && <Card className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 md:col-span-2 xl:col-span-3">No leads yet.</Card>}
      </div>

      {(showNewForm || selectedLead) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {showNewForm ? (
              <form onSubmit={createLead}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Lead</h3></div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Business Name" name="business_name" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} required />
                  <Input label="Owner Name" name="owner_name" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
                  <Input label="Phone" name="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  <Input label="Email" name="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">State</span><select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"><option value="">Select</option>{STATES.map(state => <option key={state} value={state}>{state}</option>)}</select></label>
                  {isAdmin && <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Assign Rep</span><select value={form.assigned_rep_id} onChange={e => setForm({ ...form, assigned_rep_id: e.target.value })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"><option value="">Unassigned</option>{salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>}
                  <div className="sm:col-span-2"><Textarea label="Initial Note" name="initial_note" value={form.initial_note} onChange={e => setForm({ ...form, initial_note: e.target.value })} /></div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end gap-2"><button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2 text-sm rounded-md bg-white border dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200">Cancel</button><button type="submit" className="px-4 py-2 text-sm rounded-md bg-theme-yellow text-black">Save Lead</button></div>
              </form>
            ) : selectedLead && (
              <div>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedLead.business_name}</h3><button onClick={() => setSelectedLead(null)} className="text-sm text-theme-teal">Close</button></div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Business Name" name="business_name" value={selectedLead.business_name} onChange={e => setSelectedLead({ ...selectedLead, business_name: e.target.value })} onBlur={() => void updateLead({ business_name: selectedLead.business_name })} />
                    <Input label="Owner Name" name="owner_name" value={selectedLead.owner_name || ''} onChange={e => setSelectedLead({ ...selectedLead, owner_name: e.target.value })} onBlur={() => void updateLead({ owner_name: selectedLead.owner_name })} />
                    <Input label="Phone" name="phone" value={selectedLead.phone || ''} onChange={e => setSelectedLead({ ...selectedLead, phone: e.target.value })} onBlur={() => void updateLead({ phone: selectedLead.phone })} />
                    <Input label="Email" name="email" value={selectedLead.email || ''} onChange={e => setSelectedLead({ ...selectedLead, email: e.target.value })} onBlur={() => void updateLead({ email: selectedLead.email })} />
                    <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span><select value={selectedLead.status} disabled={selectedLead.status === 'converted'} onChange={e => void updateLead({ status: e.target.value as LeadStatus })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600">{selectedLead.status === 'converted' && <option value="converted">Converted</option>}{STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                    {isAdmin && <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Assign Rep</span><select value={selectedLead.assigned_rep_id || ''} onChange={e => void updateLead({ assigned_rep_id: e.target.value || null })} className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"><option value="">Unassigned</option>{salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>}
                  </div>
                  <button disabled={selectedLead.status === 'converted'} onClick={() => void convertLead()} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90 disabled:bg-slate-300 disabled:text-slate-500">{selectedLead.status === 'converted' ? 'Already Converted' : 'Convert to Merchant'}</button>
                  <div><h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Notes</h4><div className="space-y-2 max-h-52 overflow-y-auto">{selectedLead.notes?.map(note => <div key={note.id} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800"><p className="text-sm text-slate-700 dark:text-slate-200">{note.body}</p><p className="text-xs text-slate-500 mt-1">{note.author_name || 'Unknown'} • {new Date(note.created_at).toLocaleString()}</p></div>)}</div></div>
                  <Textarea label="Add Note" name="note" value={noteBody} onChange={e => setNoteBody(e.target.value)} />
                  <div className="flex justify-end"><button onClick={() => void addNote()} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-teal hover:bg-theme-teal/90">Add Note</button></div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
