import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          {...props}
          className="block w-full appearance-none rounded-md border-0 border-b-2 border-slate-200 bg-slate-100 px-4 py-4 text-lg text-slate-800 shadow-sm transition-colors focus:border-theme-yellow focus:bg-white focus:outline-none focus:ring-0 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:focus:bg-slate-700"
        >
            {children}
        </select>
      </div>
    </div>
  );
};
