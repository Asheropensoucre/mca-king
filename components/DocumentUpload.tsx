import React, { useState, useCallback } from 'react';
import type { DocumentInfo } from '../types';

interface DocumentUploadProps {
    onDocumentsChange: (documents: DocumentInfo[]) => void;
    accept?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentsChange, accept }) => {
    const [files, setFiles] = useState<File[]>([]);
    
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        const newFiles = [...files, ...selectedFiles];
        setFiles(newFiles);
        
        const documentInfos: DocumentInfo[] = newFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
        }));
        onDocumentsChange(documentInfos);
    }, [files, onDocumentsChange]);

    const removeFile = (indexToRemove: number) => {
        const newFiles = files.filter((_, index) => index !== indexToRemove);
        setFiles(newFiles);
        
        const documentInfos: DocumentInfo[] = newFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
        }));
        onDocumentsChange(documentInfos);
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
             <div>
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-theme-teal focus-within:outline-none focus-within:ring-2 focus-within:ring-theme-teal focus-within:ring-offset-2 hover:text-theme-teal/80">
                    <span>Upload required documents</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept={accept} />
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">e.g., Bank Statements, Photo ID. PNG, JPG, PDF up to 10MB.</p>
            </div>
            {files.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-600 rounded-md p-3">
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-600">
                        {files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between py-2">
                                <div className="flex items-center min-w-0">
                                    <svg className="h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                    <p className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                                </div>
                                <div className="flex items-center">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mr-4">{formatBytes(file.size)}</p>
                                    <button type="button" onClick={() => removeFile(index)} className="text-theme-red hover:text-theme-red/80 text-sm font-medium">Remove</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};