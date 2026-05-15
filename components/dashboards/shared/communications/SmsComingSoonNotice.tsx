import React from 'react';
import { Card } from '../../../ui/Card';

export const SmsComingSoonNotice: React.FC = () => (
  <Card className="p-4 border-warning/80 bg-warning/10/95 dark:bg-warning/20">
    <h4 className="text-sm font-black uppercase tracking-wide text-warning dark:text-warning">SMS disabled / future-ready</h4>
    <p className="mt-2 text-sm font-semibold text-warning dark:text-warning">
      SMS sending is intentionally not enabled. Provider selection, A2P 10DLC registration, STOP/HELP webhooks, quiet hours,
      documented opt-in proof, and budget approval are required before SMS activation.
    </p>
  </Card>
);
