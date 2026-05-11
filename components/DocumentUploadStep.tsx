import React from 'react';
import type { DocumentInfo } from '../types';
import { DocumentUpload } from './DocumentUpload';

interface DocumentUploadStepProps {
  onDocumentsChange: (documents: DocumentInfo[]) => void;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({ onDocumentsChange }) => {
  return (
    <div>
        <div className="space-y-4 rounded-lg border border-slate-200 p-6 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Last 3 Months of Bank Statements</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Please upload PDF copies of your business bank statements for the last three consecutive months. You can select multiple files at once.</p>
            <DocumentUpload onDocumentsChange={onDocumentsChange} accept=".pdf" />
        </div>
    </div>
  );
};