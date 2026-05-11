import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          {...props}
          className="block w-full rounded-md border-0 border-b-2 border-slate-200 bg-slate-100 px-4 py-4 text-lg text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-theme-yellow focus:bg-white focus:outline-none focus:ring-0 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:focus:bg-slate-700"
        />
      </div>
    </div>
  );
};