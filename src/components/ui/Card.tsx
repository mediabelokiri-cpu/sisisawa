import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-subtle p-5 sm:p-6 transition-all ${
        onClick ? 'cursor-pointer hover:border-amber-300 active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

