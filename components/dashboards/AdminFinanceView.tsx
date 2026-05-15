import React, { useEffect, useMemo, useState } from 'react';
import type { BrokerRevenue, Funding, SalesRepCommission } from '../../types';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { api } from '../../src/lib/api-client';
import { MCAKingLoader } from '../../src/components/ui/MCAKingLoader';

const money = (value: number | string | null | undefined): string => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toLocaleString()}` : '$0';
};

const date = (value: string | null | undefined): string => value ? new Date(value).toLocaleDateString() : 'N/A';

export const AdminFinanceView: React.FC = () => {
  const [fundings, setFundings] = useState<Funding[]>([]);
  const [revenue, setRevenue] = useState<BrokerRevenue[]>([]);
  const [commissions, setCommissions] = useState<SalesRepCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundingData, revenueData, commissionData] = await Promise.all([
        api.fundings.list(),
        api.brokerRevenue.list(),
        api.salesRepCommissions.list(),
      ]);
      setFundings(fundingData);
      setRevenue(revenueData);
      setCommissions(commissionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load finance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const totals = useMemo(() => ({
    funded: fundings.reduce((sum, item) => sum + Number(item.funded_amount ?? 0), 0),
    revenueExpected: revenue.filter(item => item.status !== 'received' && item.status !== 'waived').reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    revenueReceived: revenue.filter(item => item.status === 'received').reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    commissionsUnpaid: commissions.filter(item => item.status === 'unpaid' || item.status === 'approved').reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  }), [fundings, revenue, commissions]);

  const updateRevenueStatus = async (item: BrokerRevenue, status: BrokerRevenue['status']) => {
    setMessage(null);
    try {
      await api.brokerRevenue.update(item.id, { status, received_at: status === 'received' ? new Date().toISOString() : item.received_at });
      await loadData();
      setMessage('Broker revenue updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update broker revenue.');
    }
  };

  const updateCommissionStatus = async (item: SalesRepCommission, status: SalesRepCommission['status']) => {
    setMessage(null);
    try {
      await api.salesRepCommissions.update(item.id, { status, paid_at: status === 'paid' ? new Date().toISOString() : item.paid_at });
      await loadData();
      setMessage('Sales rep commission updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update sales rep commission.');
    }
  };

  if (loading) return <MCAKingLoader label="Loading finance dashboard..." centered />;

  return (
    <div className="space-y-6">
      {message && <p className="rounded-md bg-secondary/10 px-3 py-2 text-sm text-secondary">{message}</p>}
      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/20 dark:text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><div className="p-4"><p className="text-xs font-black uppercase text-muted">Funded Volume</p><p className="mt-2 text-2xl font-black text-main ">{money(totals.funded)}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs font-black uppercase text-muted">Revenue Expected</p><p className="mt-2 text-2xl font-black text-main ">{money(totals.revenueExpected)}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs font-black uppercase text-muted">Revenue Received</p><p className="mt-2 text-2xl font-black text-main ">{money(totals.revenueReceived)}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs font-black uppercase text-muted">Rep Commission Liability</p><p className="mt-2 text-2xl font-black text-main ">{money(totals.commissionsUnpaid)}</p></div></Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-black text-main ">Funded Deals</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-primary"><tr className="text-left text-xs font-black uppercase tracking-wider text-accent"><th>Merchant</th><th>Lender/Funder</th><th>Amount</th><th>Factor</th><th>Funded</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {fundings.length > 0 ? fundings.map(item => <tr key={item.id}><td className="px-4 py-3 text-sm font-bold">{item.merchant_name ?? 'N/A'}</td><td className="px-4 py-3 text-sm">{item.lender_name ?? 'N/A'}</td><td className="px-4 py-3 text-sm">{money(item.funded_amount)}</td><td className="px-4 py-3 text-sm">{item.factor_rate ?? 'N/A'}</td><td className="px-4 py-3 text-sm">{date(item.funded_at)}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No funded deals yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-black text-main ">Broker Revenue</h3>
          <div className="mt-4 space-y-3">
            {revenue.length > 0 ? revenue.map(item => (
              <div key={item.id} className="grid grid-cols-1 gap-3 rounded-lg border border-line p-4  md:grid-cols-5 md:items-center">
                <div className="md:col-span-2"><p className="font-bold">{item.merchant_name ?? 'N/A'}</p><p className="text-sm text-muted">{item.lender_name ?? 'N/A'}</p></div>
                <p className="text-sm font-black">{money(item.amount)}</p>
                <p className="text-sm text-muted">{item.revenue_type}</p>
                <Select label="Status" value={item.status} onChange={event => void updateRevenueStatus(item, event.target.value as BrokerRevenue['status'])}>
                  <option value="expected">Expected</option><option value="invoiced">Invoiced</option><option value="received">Received</option><option value="short_paid">Short Paid</option><option value="disputed">Disputed</option><option value="waived">Waived</option>
                </Select>
              </div>
            )) : <p className="text-sm text-muted">No broker revenue records yet.</p>}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-black text-main ">Sales Rep Commissions</h3>
          <div className="mt-4 space-y-3">
            {commissions.length > 0 ? commissions.map(item => (
              <div key={item.id} className="grid grid-cols-1 gap-3 rounded-lg border border-line p-4  md:grid-cols-5 md:items-center">
                <div className="md:col-span-2"><p className="font-bold">{item.sales_rep_name ?? 'Unassigned Rep'}</p><p className="text-sm text-muted">{item.merchant_name ?? 'N/A'}</p></div>
                <p className="text-sm font-black">{money(item.amount)}</p>
                <p className="text-sm text-muted">{item.basis_type}</p>
                <Select label="Status" value={item.status} onChange={event => void updateCommissionStatus(item, event.target.value as SalesRepCommission['status'])}>
                  <option value="unpaid">Unpaid</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="adjusted">Adjusted</option><option value="clawed_back">Clawed Back</option><option value="void">Void</option>
                </Select>
              </div>
            )) : <p className="text-sm text-muted">No sales rep commission records yet.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
};
