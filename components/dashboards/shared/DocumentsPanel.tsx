import React, { useEffect, useState } from 'react';
import type { DocType, Document } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Card } from '../../ui/Card';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';
import { ResponsiveDataList } from './mobile/ResponsiveDataList';

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'contract', label: 'Contract' },
  { value: 'stipulation', label: 'Stipulation' },
  { value: 'id', label: 'ID' },
  { value: 'other', label: 'Other' },
];

interface DocumentsPanelProps {
  merchantId: string;
  canDelete?: boolean;
  canUpload?: boolean;
  title?: string;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ merchantId, canDelete = false, canUpload = true, title = 'Documents' }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docType, setDocType] = useState<DocType>('bank_statement');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDocuments = async () => {
    setDocuments(await api.documents.list(merchantId));
  };

  useEffect(() => { void loadDocuments().catch(err => setMessage(err instanceof Error ? err.message : 'Could not load documents.')); }, [merchantId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.documents.upload(merchantId, docType, file);
      await loadDocuments();
      setMessage('Document uploaded.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await api.documents.delete(id);
    await loadDocuments();
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-lg font-black text-main ">{title}</h3>
          {canUpload && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select value={docType} onChange={e => setDocType(e.target.value as DocType)} className="rounded-md border-0 py-1.5 pl-3 pr-8 text-sm text-main ring-1 ring-inset ring-line   ring-line">
                {DOC_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              {loading ? (
                <MCAKingLoader label="Uploading..." size="small" />
              ) : (
                <label className="cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium text-on-accent bg-accent hover:bg-accent/90 text-center">
                  Upload
                  <input type="file" className="sr-only" onChange={handleUpload} disabled={loading} />
                </label>
              )}
            </div>
          )}
        </div>
        {message && <p className="text-xs text-muted mb-3">{message}</p>}
        {documents.length > 0 ? (
          <ResponsiveDataList<Document>
            rows={documents}
            getKey={(doc) => doc.id}
            mobileCard={(doc) => (
              <div className="rounded-lg border border-line bg-surface-muted p-3">
                <p className="break-all text-sm font-black text-main">{doc.file_name}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{doc.doc_type.replace('_', ' ')} • {new Date(doc.uploaded_at).toLocaleString()}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-black">
                  {doc.signed_url && <a href={doc.signed_url} target="_blank" rel="noreferrer" className="text-secondary hover:text-secondary/80">View</a>}
                  {canDelete && <button onClick={() => void handleDelete(doc.id)} className="text-danger hover:text-danger/80">Delete</button>}
                </div>
              </div>
            )}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-primary"><tr><th className="px-4 py-2 text-left text-xs font-black text-accent uppercase">File</th><th className="px-4 py-2 text-left text-xs font-black text-accent uppercase">Type</th><th className="px-4 py-2 text-left text-xs font-black text-accent uppercase">Uploaded</th><th className="px-4 py-2 text-right text-xs font-black text-accent uppercase">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td className="px-4 py-2 text-sm text-main">{doc.file_name}</td>
                      <td className="px-4 py-2 text-sm text-muted">{doc.doc_type.replace('_', ' ')}</td>
                      <td className="px-4 py-2 text-sm text-muted">{new Date(doc.uploaded_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-sm space-x-3">
                        {doc.signed_url && <a href={doc.signed_url} target="_blank" rel="noreferrer" className="text-secondary hover:text-secondary/80">View</a>}
                        {canDelete && <button onClick={() => void handleDelete(doc.id)} className="text-danger hover:text-danger/80">Delete</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResponsiveDataList>
        ) : <p className="text-sm text-muted">No documents uploaded yet.</p>}
      </div>
    </Card>
  );
};
