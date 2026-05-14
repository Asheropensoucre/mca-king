import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, FormData, Funding, LenderInfo, Offer } from '../../../types';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { api } from '../../../src/lib/api-client';

interface FundingModalProps {
  merchant: FormData;
  lenders: LenderInfo[];
  currentUser: AuthUser;
  onClose: () => void;
  onFunded: (updatedMerchant: FormData) => void;
}

const numberValue = (value: string | undefined): string => value ? String(value).replace(/[^0-9.]/g, '') : '';

export const FundingModal: React.FC<FundingModalProps> = ({ merchant, lenders, currentUser, onClose, onFunded }) => {
  const acceptedOffer = useMemo(() => (merchant.offers ?? []).find(offer => offer.status === 'Accepted') ?? null, [merchant.offers]);
  const [offerId, setOfferId] = useState(acceptedOffer?.id ?? '');
  const selectedOffer: Offer | null = useMemo(() => (merchant.offers ?? []).find(offer => offer.id === offerId) ?? acceptedOffer, [merchant.offers, offerId, acceptedOffer]);
  const initialLenderId = selectedOffer?.lenderId ?? merchant.offers?.[0]?.lenderId ?? '';

  const [existingFundings, setExistingFundings] = useState<Funding[]>([]);
  const existingFundingCount = existingFundings.length;
  const defaultFundingType: Funding['funding_type'] = existingFundingCount === 0 ? 'first_funding' : 'renewal';

  const [fundingType, setFundingType] = useState<Funding['funding_type']>(defaultFundingType);
  const [renewalNumber, setRenewalNumber] = useState(existingFundingCount > 0 ? String(existingFundingCount) : '0');
  const [fundingPosition, setFundingPosition] = useState(String(existingFundingCount + 1));
  const [lenderId, setLenderId] = useState(initialLenderId);
  const [fundedAmount, setFundedAmount] = useState(numberValue(selectedOffer?.amount));
  const [paybackAmount, setPaybackAmount] = useState('');
  const [factorRate, setFactorRate] = useState(selectedOffer?.rate ?? '');
  const [termDays, setTermDays] = useState(numberValue(selectedOffer?.term));
  const [paymentFrequency, setPaymentFrequency] = useState('daily');
  const [brokerRevenueAmount, setBrokerRevenueAmount] = useState('');
  const [brokerRevenueRate, setBrokerRevenueRate] = useState('');
  const [salesRepCommissionAmount, setSalesRepCommissionAmount] = useState('');
  const [salesRepCommissionRate, setSalesRepCommissionRate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreateFinanceRecords = currentUser.role === 'admin';

  useEffect(() => {
    api.fundings.list({ merchant_id: merchant.id })
      .then(records => {
        setExistingFundings(records);
        if (records.length > 0) {
          setFundingType('renewal');
          setRenewalNumber(String(records.length));
          setFundingPosition(String(records.length + 1));
        }
      })
      .catch(() => undefined);
  }, [merchant.id]);

  const fundingRoundValue = fundingType === 'renewal' ? `renewal_${renewalNumber || Math.max(1, existingFundingCount)}` : fundingType;
  const renewalRoundOptions = Array.from({ length: Math.max(3, existingFundingCount + 2) }, (_, index) => index + 1);

  const handleFundingRoundChange = (value: string) => {
    if (value.startsWith('renewal_')) {
      setFundingType('renewal');
      setRenewalNumber(value.replace('renewal_', ''));
      return;
    }
    const nextType = value as Funding['funding_type'];
    setFundingType(nextType);
    if (nextType === 'first_funding' || nextType === 'additional_funding') setRenewalNumber('0');
  };

  const handleOfferChange = (nextOfferId: string) => {
    setOfferId(nextOfferId);
    const nextOffer = (merchant.offers ?? []).find(offer => offer.id === nextOfferId);
    if (!nextOffer) return;
    setLenderId(nextOffer.lenderId);
    setFundedAmount(numberValue(nextOffer.amount));
    setFactorRate(nextOffer.rate ?? '');
    setTermDays(numberValue(nextOffer.term));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.fundings.create({
        merchant_id: merchant.id,
        lender_id: lenderId || null,
        offer_id: offerId || null,
        funded_amount: fundedAmount,
        funding_type: fundingType,
        renewal_number: fundingType === 'renewal' ? renewalNumber : 0,
        funding_position: fundingPosition,
        payback_amount: paybackAmount || null,
        factor_rate: factorRate || null,
        payment_frequency: paymentFrequency,
        term_days: termDays || null,
        notes: notes || null,
        broker_revenue_amount: canCreateFinanceRecords ? brokerRevenueAmount || null : null,
        broker_revenue_rate: canCreateFinanceRecords ? brokerRevenueRate || null : null,
        sales_rep_commission_amount: canCreateFinanceRecords ? salesRepCommissionAmount || null : null,
        sales_rep_commission_rate: canCreateFinanceRecords ? salesRepCommissionRate || null : null,
      });
      const updatedMerchant = await api.merchants.get(merchant.id);
      onFunded(updatedMerchant);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark deal funded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-black text-theme-maroon dark:text-theme-yellow">Mark Deal Funded</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a funding record for {merchant.businessInfo.legalName} and move the merchant to FUNDED.</p>
            {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

            <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h4 className="font-black text-theme-maroon dark:text-theme-yellow">Funding Record Type</h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track first-time funding, later renewals, and multiple lender/funder positions on the same merchant.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select label="Funding Round" value={fundingRoundValue} onChange={event => handleFundingRoundChange(event.target.value)}>
                  <option value="first_funding">First Funding</option>
                  {renewalRoundOptions.map(round => <option key={round} value={`renewal_${round}`}>{round === 1 ? '1st' : round === 2 ? '2nd' : round === 3 ? '3rd' : `${round}th`} Renewal</option>)}
                  <option value="additional_funding">Additional Funding / Split Position</option>
                </Select>
                <Input label="Renewal #" type="number" min="0" step="1" value={renewalNumber} onChange={event => setRenewalNumber(event.target.value)} disabled={fundingType !== 'renewal'} />
                <Input label="Funding Position #" type="number" min="1" step="1" value={fundingPosition} onChange={event => setFundingPosition(event.target.value)} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select label="Accepted Offer" value={offerId} onChange={event => handleOfferChange(event.target.value)}>
                <option value="">No linked offer</option>
                {(merchant.offers ?? []).map(offer => <option key={offer.id ?? offer.lenderId} value={offer.id ?? ''}>{offer.lenderName} — ${Number(offer.amount).toLocaleString()} ({offer.status})</option>)}
              </Select>
              <Select label="Funding Lender/Funder" value={lenderId} onChange={event => setLenderId(event.target.value)}>
                <option value="">Select lender/funder</option>
                {lenders.map(lender => <option key={lender.id} value={lender.id}>{lender.lenderName}</option>)}
              </Select>
              <Input label="Funded Amount ($)" type="number" min="0" step="0.01" value={fundedAmount} onChange={event => setFundedAmount(event.target.value)} required />
              <Input label="Payback Amount ($)" type="number" min="0" step="0.01" value={paybackAmount} onChange={event => setPaybackAmount(event.target.value)} />
              <Input label="Factor Rate" type="number" min="0" step="0.001" value={factorRate} onChange={event => setFactorRate(event.target.value)} />
              <Input label="Term Days" type="number" min="0" step="1" value={termDays} onChange={event => setTermDays(event.target.value)} />
              <Select label="Payment Frequency" value={paymentFrequency} onChange={event => setPaymentFrequency(event.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>

            {canCreateFinanceRecords && (
              <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h4 className="font-black text-theme-maroon dark:text-theme-yellow">Broker Revenue + Rep Commission</h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Optional internal records. This tracks money owed to the brokerage by the lender/funder and internal sales rep payout. No lender-side manager payout is created.</p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Broker Revenue Amount ($)" type="number" min="0" step="0.01" value={brokerRevenueAmount} onChange={event => setBrokerRevenueAmount(event.target.value)} />
                  <Input label="Broker Revenue Rate" type="number" min="0" step="0.001" value={brokerRevenueRate} onChange={event => setBrokerRevenueRate(event.target.value)} />
                  <Input label="Sales Rep Commission Amount ($)" type="number" min="0" step="0.01" value={salesRepCommissionAmount} onChange={event => setSalesRepCommissionAmount(event.target.value)} disabled={!merchant.salesRepId} />
                  <Input label="Sales Rep Commission Rate" type="number" min="0" step="0.001" value={salesRepCommissionRate} onChange={event => setSalesRepCommissionRate(event.target.value)} disabled={!merchant.salesRepId} />
                </div>
                {!merchant.salesRepId && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Assign a sales rep before creating an internal sales rep commission record.</p>}
              </div>
            )}

            <div className="mt-6">
              <Textarea label="Funding Notes" value={notes} onChange={event => setNotes(event.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t bg-slate-50 p-4 dark:bg-slate-800/50">
            <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onClose} disabled={submitting} />
            <PrimaryButton label={submitting ? 'Saving...' : 'Mark Funded'} type="submit" variant="funded" disabled={submitting} />
          </div>
        </form>
      </Card>
    </div>
  );
};
