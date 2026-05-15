import React, { useEffect, useRef, useState } from 'react';
import type { SearchResults } from '../../../types';
import { api } from '../../../src/lib/api-client';

export type SearchResultSelection =
  | { type: 'merchant'; id: string }
  | { type: 'lead'; id: string }
  | { type: 'lender'; id: string };

interface SearchBarProps {
  onSelectResult: (selection: SearchResultSelection) => void;
}

const emptyResults: SearchResults = { merchants: [], leads: [], lenders: [], query: '' };

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectResult }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults(emptyResults);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      api.search.global(q)
        .then(data => {
          setResults(data);
          setOpen(true);
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Search failed'))
        .finally(() => setLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [term]);

  const hasResults = results.merchants.length > 0 || results.leads.length > 0 || results.lenders.length > 0;

  const select = (selection: SearchResultSelection) => {
    setOpen(false);
    onSelectResult(selection);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary">⌕</span>
        <input
          value={term}
          onChange={event => setTerm(event.target.value)}
          onFocus={() => term.trim().length >= 2 && setOpen(true)}
          onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
          placeholder="Search merchants, leads, lenders..."
          className="w-full rounded-xl border-2 border-secondary/60 bg-surface px-10 py-2 text-sm font-semibold text-main shadow-[4px_4px_0_var(--ct-primary)] outline-none focus:border-accent -muted  dark:shadow-[4px_4px_0_var(--ct-secondary-fixed-dim)]"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary">...</span>}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border-2 border-line-strong bg-surface p-3 shadow-[6px_6px_0_var(--ct-primary)] dark:border-accent  dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)]">
          {error && <p className="p-3 text-sm text-danger dark:text-danger">{error}</p>}
          {!error && !hasResults && <p className="p-3 text-sm font-semibold text-muted">No results</p>}

          {results.merchants.length > 0 && (
            <SearchSection title="Merchants">
              {results.merchants.map(merchant => (
                <button key={merchant.id} type="button" onClick={() => select({ type: 'merchant', id: merchant.id })} className="w-full rounded-lg p-2 text-left hover:bg-accent/20">
                  <p className="font-black text-main ">{merchant.business_name}</p>
                  <p className="text-xs text-muted">{merchant.status} • {merchant.state || 'No state'}</p>
                </button>
              ))}
            </SearchSection>
          )}

          {results.leads.length > 0 && (
            <SearchSection title="Leads">
              {results.leads.map(lead => (
                <button key={lead.id} type="button" onClick={() => select({ type: 'lead', id: lead.id })} className="w-full rounded-lg p-2 text-left hover:bg-accent/20">
                  <p className="font-black text-main ">{lead.business_name}</p>
                  <p className="text-xs text-muted">{lead.owner_name || 'No owner'} • {lead.status}</p>
                </button>
              ))}
            </SearchSection>
          )}

          {results.lenders.length > 0 && (
            <SearchSection title="Lenders">
              {results.lenders.map(lender => (
                <button key={lender.id} type="button" onClick={() => select({ type: 'lender', id: lender.id })} className="w-full rounded-lg p-2 text-left hover:bg-accent/20">
                  <p className="font-black text-main ">{lender.company_name}</p>
                  <p className="text-xs text-muted">{lender.contact_name || 'No contact'} • {lender.contact_email}</p>
                </button>
              ))}
            </SearchSection>
          )}
        </div>
      )}
    </div>
  );
};

const SearchSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-3 last:mb-0">
    <h4 className="mb-1 text-xs font-black uppercase tracking-wider text-secondary">{title}</h4>
    <div className="space-y-1">{children}</div>
  </div>
);
