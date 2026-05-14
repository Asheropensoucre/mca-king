import React from 'react';
import { Card } from '../../../ui/Card';

export const SmsComingSoonNotice: React.FC = () => (
  <Card className="p-4 border-amber-400/80 bg-amber-50/95 dark:bg-amber-950/40">
    <h4 className="text-sm font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">SMS disabled / future-ready</h4>
    <p className="mt-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
      SMS sending is intentionally not enabled. Provider selection, A2P 10DLC registration, STOP/HELP webhooks, quiet hours,
      documented opt-in proof, and budget approval are required before SMS activation.
    </p>
  </Card>
);
