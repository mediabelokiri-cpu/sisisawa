import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full min-h-[44px] px-4 py-2.5 bg-white border rounded-pos text-slate-800 text-base placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-secondary/40 focus:border-brand-primary disabled:bg-slate-50 disabled:text-slate-500 ${
              icon ? 'pl-11' : ''
            } ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
