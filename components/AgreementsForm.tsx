import React, { useEffect } from 'react';
import type { Agreements } from '../types';
import { SignaturePad } from './SignaturePad';

interface AgreementsFormProps {
  data: Agreements;
  updateData: (data: Partial<Agreements>) => void;
}

export const AgreementsForm: React.FC<AgreementsFormProps> = ({ data, updateData }) => {
  useEffect(() => {
    // NOTE: In a real app, you'd use a service to get the IP address.
    // We'll use a placeholder.
    updateData({ ipAddress: '127.0.0.1 (simulated)' });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateData({
            geolocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
        },
        () => {
          // Handle error or user denial
          updateData({ geolocation: null });
        }
      );
    }
  }, [updateData]);

  const handleSignatureEnd = (signature: string) => {
    updateData({ signatureDataUrl: signature });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ creditAuth: e.target.checked });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Terms & Authorizations</h3>
        <div className="relative flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="creditAuth"
              name="creditAuth"
              type="checkbox"
              checked={data.creditAuth}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-theme-yellow focus:ring-theme-yellow"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="creditAuth" className="font-medium text-slate-900 dark:text-slate-100">
              Authorization to Obtain Credit Report
            </label>
            <p className="text-slate-500 dark:text-slate-400">
              By checking this box, you authorize us and our partners to obtain credit reports in connection with this application and for any lawful purpose, including but not limited to, for underwriting, servicing, and collections.
            </p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Signature</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Please sign in the box below. By signing, you certify that all information provided is true and correct and that you agree to the terms and conditions of this application.
        </p>
        <SignaturePad onSignatureEnd={handleSignatureEnd} />
      </div>
    </div>
  );
};