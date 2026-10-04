import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-pos transition-all duration-150 select-none min-h-[44px] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 shadow-sm';

  const sizeStyles = {
    sm: 'px-3.5 py-2 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-brand-primary text-white hover:bg-[#6F441E] active:bg-[#3E2410]',
    accent: 'bg-brand-primary text-white hover:bg-[#6F441E] active:bg-[#3E2410] shadow-sm',
    secondary: 'bg-brand-secondary text-white hover:bg-[#77837F] active:bg-[#626E6A]',
    outline: 'border-2 border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary/5 active:bg-brand-primary/10',
    ghost: 'text-brand-primary bg-transparent hover:bg-brand-primary/5 active:bg-brand-primary/10 shadow-none',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
