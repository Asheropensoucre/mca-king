import React from 'react';
import type { DocumentInfo } from '../types';
import { DocumentUpload } from './DocumentUpload';

interface DocumentUploadStepProps {
  onDocumentsChange: (documents: DocumentInfo[]) => void;
  merchantId?: string;
  onUploaded?: () => void;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({ onDocumentsChange, merchantId, onUploaded }) => {
  return (
    <div>
        <div className="space-y-4 rounded-lg border border-line p-6 bg-surface-muted -muted/50 ">
            <h4 className="font-semibold text-main">Last 3 Months of Bank Statements</h4>
            <p className="text-sm text-muted ">Please upload PDF copies of your business bank statements for the last three consecutive months. You can select multiple files at once.</p>
            <DocumentUpload onDocumentsChange={onDocumentsChange} accept=".pdf" merchantId={merchantId} docType="bank_statement" onUploaded={onUploaded} />
        </div>
    </div>
  );
};
