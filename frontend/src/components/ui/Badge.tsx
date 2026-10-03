import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'md' }) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs sm:text-sm',
  };

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold',
    info: 'bg-[#8B9793]/15 text-[#835227] border border-[#8B9793]/40 font-semibold',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
  };

  return (
    <span className={`inline-flex items-center justify-center rounded-full ${sizeStyles[size]} ${variantStyles[variant]}`}>
      {children}
    </span>
  );
};
