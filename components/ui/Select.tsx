import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, className = '', ...props }) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-base font-bold text-main">
        {label}
      </label>
      <select
        id={id}
        {...props}
        className="block w-full appearance-none rounded-lg border-2 border-line bg-surface px-4 py-3 text-base font-semibold text-main shadow-sm transition-colors focus:border-line-strong focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
    </div>
  );
};
