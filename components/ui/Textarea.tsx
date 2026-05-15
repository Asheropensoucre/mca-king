import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, className = '', ...props }) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-base font-bold text-main">
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        className="block w-full rounded-lg border-2 border-line bg-surface px-4 py-3 text-base font-semibold text-main shadow-sm transition-colors placeholder:text-muted focus:border-line-strong focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
};
