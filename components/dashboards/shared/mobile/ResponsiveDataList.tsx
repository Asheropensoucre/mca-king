import React from 'react';

interface ResponsiveDataListProps<T> {
  rows: T[];
  getKey: (row: T) => React.Key;
  mobileCard: (row: T) => React.ReactNode;
  children: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  desktopBreakpoint?: 'md' | 'lg';
}

export const ResponsiveDataList = <T,>({
  rows,
  getKey,
  mobileCard,
  children,
  empty,
  className = '',
  mobileClassName = '',
  desktopBreakpoint = 'md',
}: ResponsiveDataListProps<T>) => {
  const desktopClass = desktopBreakpoint === 'lg' ? 'hidden lg:block' : 'hidden md:block';
  const mobileClass = desktopBreakpoint === 'lg' ? 'lg:hidden' : 'md:hidden';

  return (
    <>
      <div className={`${desktopClass} ${className}`}>{children}</div>
      <div className={`${mobileClass} ${mobileClassName}`}>
        {rows.length > 0 ? <div className="space-y-3">{rows.map(row => <div key={getKey(row)}>{mobileCard(row)}</div>)}</div> : empty}
      </div>
    </>
  );
};
