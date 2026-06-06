import React, { useMemo, useState } from 'react';
import type { LeadImportField, LeadImportResult, LeadImportRow, LeadStatus } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { downloadCsv, parseCsv } from '../../../src/lib/csv';
import { Card } from '../../ui/Card';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';

interface LeadImportModalProps {
  isAdmin: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

type Mapping = Record<LeadImportField, string>;

const FIELDS: Array<{ value: LeadImportField; label: string; required?: boolean }> = [
  { value: 'business_name', label: 'Business Name', required: true },
  { value: 'owner_name', label: 'Owner Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'state', label: 'State' },
  { value: 'initial_note', label: 'Initial Note' },
  { value: 'assigned_rep_email', label: 'Assigned Rep Email' },
  { value: 'status', label: 'Status' },
];

const STATUS_VALUES: LeadStatus[] = ['new', 'contacted', 'docs_requested', 'dead'];

const EXAMPLE_CSV_ROWS: LeadImportRow[] = [
  {
    business_name: 'Blue Sky Deli',
    owner_name: 'Maria Lopez',
    phone: '555-555-0101',
    email: 'maria@example.com',
    state: 'NY',
    initial_note: 'Interested in working capital',
    assigned_rep_email: '',
    status: 'new',
  },
  {
    business_name: 'Desert Auto Repair',
    owner_name: 'James Carter',
    phone: '555-555-0199',
    email: 'james@example.com',
    state: 'AZ',
    initial_note: 'Asked for follow-up next week',
    assigned_rep_email: 'rep@example.com',
    status: 'contacted',
  },
];

const aliases: Record<LeadImportField, string[]> = {
  business_name: ['business_name', 'business name', 'company', 'company name', 'dba', 'legal name', 'business'],
  owner_name: ['owner_name', 'owner name', 'owner', 'contact', 'contact name', 'name'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'cell phone', 'telephone'],
  email: ['email', 'email address', 'e-mail'],
  state: ['state', 'st'],
  initial_note: ['initial_note', 'initial note', 'notes', 'note', 'comments'],
  assigned_rep_email: ['assigned_rep_email', 'assigned rep email', 'rep email', 'sales rep email', 'assigned rep', 'rep'],
  status: ['status', 'lead status'],
};

const emptyMapping = (): Mapping => ({
  business_name: '',
  owner_name: '',
  phone: '',
  email: '',
  state: '',
  initial_note: '',
  assigned_rep_email: '',
  status: '',
});

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

function autoMap(headers: string[]): Mapping {
  const mapping = emptyMapping();
  const normalizedHeaders = headers.map(header => ({ raw: header, normalized: normalize(header) }));
  for (const field of FIELDS) {
    const match = normalizedHeaders.find(header => aliases[field.value].includes(header.normalized));
    if (match) mapping[field.value] = match.raw;
  }
  return mapping;
}

function rowsToImport(headers: string[], rows: string[][], mapping: Mapping): LeadImportRow[] {
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  return rows.map(row => {
    const output: LeadImportRow = {};
    for (const field of FIELDS) {
      const mappedHeader = mapping[field.value];
      if (!mappedHeader) continue;
      const index = headerIndex.get(mappedHeader);
      if (index === undefined) continue;
      output[field.value] = row[index]?.trim() ?? '';
    }
    return output;
  });
}

function validateRows(rows: LeadImportRow[]): { valid: number; missingBusinessName: number; invalidStatus: number; duplicateInFile: number } {
  const seen = new Set<string>();
  let missingBusinessName = 0;
  let invalidStatus = 0;
  let duplicateInFile = 0;
  let valid = 0;

  for (const row of rows) {
    const businessName = row.business_name?.trim() ?? '';
    if (!businessName) {
      missingBusinessName += 1;
      continue;
    }

    const status = row.status?.trim().toLowerCase().replace(/[\s-]+/g, '_') as LeadStatus | '';
    if (status && !STATUS_VALUES.includes(status)) {
      invalidStatus += 1;
      continue;
    }

    const duplicateKey = [
      row.email?.trim().toLowerCase() ? `email:${row.email.trim().toLowerCase()}` : '',
      row.phone?.trim() ? `phone:${row.phone.replace(/\D/g, '')}` : '',
      row.state?.trim() ? `business_state:${businessName.toLowerCase()}|${row.state.trim().toLowerCase()}` : '',
    ].filter(Boolean).join('||');

    if (duplicateKey && seen.has(duplicateKey)) duplicateInFile += 1;
    else if (duplicateKey) seen.add(duplicateKey);

    valid += 1;
  }

  return { valid, missingBusinessName, invalidStatus, duplicateInFile };
}

export const LeadImportModal: React.FC<LeadImportModalProps> = ({ isAdmin, onClose, onImported }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const importRows = useMemo(() => rowsToImport(headers, rawRows, mapping), [headers, rawRows, mapping]);
  const validation = useMemo(() => validateRows(importRows), [importRows]);
  const canImport = importRows.length > 0 && mapping.business_name.length > 0 && validation.valid > 0 && !importing;

  const downloadExampleCsv = () => {
    downloadCsv('mca-king-lead-import-example.csv', EXAMPLE_CSV_ROWS);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setMessage(null);
    setResult(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('CSV file must be 5MB or smaller.');
      return;
    }

    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      setError('CSV must include a header row and at least one lead row.');
      return;
    }

    const nextHeaders = parsed[0].map(header => header.trim()).filter(Boolean);
    const nextRows = parsed.slice(1).filter(row => row.some(value => value.trim().length > 0));
    if (nextRows.length > 5000) {
      setError('CSV import is limited to 5,000 rows.');
      return;
    }

    setHeaders(nextHeaders);
    setRawRows(nextRows);
    setMapping(autoMap(nextHeaders));
    setMessage(`Loaded ${nextRows.length} row${nextRows.length === 1 ? '' : 's'} from ${file.name}.`);
  };

  const doImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.leads.import(importRows);
      setResult(response);
      await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import leads.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <h3 className="text-xl font-black text-main">Import Leads from CSV</h3>
            <p className="mt-1 text-sm text-muted">Upload leads in bulk. Duplicates are skipped; records are validated again on the server.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-black text-secondary">Close</button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border-2 border-dashed border-line bg-surface-muted p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="text-sm font-black text-main">CSV File</span>
                <input type="file" accept=".csv,text/csv" onChange={handleFile} className="mt-3 block w-full text-sm text-main file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:font-black file:text-on-accent" />
              </label>
              <PrimaryButton label="Download Example CSV" size="small" onClick={downloadExampleCsv} />
            </div>
            <p className="mt-3 text-xs font-semibold text-muted">Supported columns include Business Name, Owner Name, Phone, Email, State, Notes, Status{isAdmin ? ', and Assigned Rep Email' : ''}. Sales reps can leave assigned_rep_email blank because imports are assigned to them automatically.</p>
          </div>

          {message && <p className="rounded-lg bg-secondary/10 p-3 text-sm font-bold text-secondary">{message}</p>}
          {error && <p className="rounded-lg bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p>}

          {headers.length > 0 && (
            <>
              <div>
                <h4 className="text-lg font-black text-main">Map Columns</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {FIELDS.filter(field => isAdmin || field.value !== 'assigned_rep_email').map(field => (
                    <label key={field.value} className="block">
                      <span className="text-sm font-bold text-main">{field.label}{field.required ? ' *' : ''}</span>
                      <select
                        value={mapping[field.value]}
                        onChange={event => setMapping(prev => ({ ...prev, [field.value]: event.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 bg-surface px-3 py-2 text-main ring-1 ring-inset ring-line dark:bg-surface-muted"
                      >
                        <option value="">Do not import</option>
                        {headers.map(header => <option key={header} value={header}>{header}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Rows" value={importRows.length} />
                <Metric label="Valid Preview" value={validation.valid} />
                <Metric label="Missing Business" value={validation.missingBusinessName} danger={validation.missingBusinessName > 0} />
                <Metric label="Bad Status" value={validation.invalidStatus} danger={validation.invalidStatus > 0} />
              </div>
              {validation.duplicateInFile > 0 && <p className="text-sm font-semibold text-warning">{validation.duplicateInFile} possible duplicate row{validation.duplicateInFile === 1 ? '' : 's'} found inside this CSV. Existing database duplicates are checked and skipped during import.</p>}

              <div>
                <h4 className="text-lg font-black text-main">Preview</h4>
                <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-sm">
                    <thead className="bg-primary text-on-primary"><tr>{FIELDS.filter(field => mapping[field.value]).map(field => <th key={field.value} className="px-3 py-2 text-left font-black">{field.label}</th>)}</tr></thead>
                    <tbody>
                      {importRows.slice(0, 8).map((row, index) => (
                        <tr key={index} className="border-t border-line bg-surface-muted/40">
                          {FIELDS.filter(field => mapping[field.value]).map(field => <td key={field.value} className="px-3 py-2 text-main">{row[field.value] || '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {result && (
            <div className="rounded-xl border-2 border-secondary/40 bg-secondary/10 p-4 text-sm font-bold text-main">
              Imported {result.imported} of {result.total_rows}. Skipped {result.skipped_duplicates} duplicate{result.skipped_duplicates === 1 ? '' : 's'} and {result.skipped_invalid} invalid row{result.skipped_invalid === 1 ? '' : 's'}.
              {result.errors.length > 0 && <p className="mt-2 text-danger">First issue: row {result.errors[0].row} — {result.errors[0].reason}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-surface-muted p-4">
          <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onClose} />
          <PrimaryButton label={importing ? 'Importing...' : 'Import Leads'} size="small" disabled={!canImport} onClick={() => void doImport()} />
        </div>
      </Card>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; danger?: boolean }> = ({ label, value, danger = false }) => (
  <div className={`rounded-xl border p-4 ${danger ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line bg-surface-muted text-main'}`}>
    <p className="text-xs font-black uppercase tracking-wider text-muted">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
  </div>
);
