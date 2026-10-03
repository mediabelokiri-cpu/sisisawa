import React, { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-[#835227]/10',
  iconColor = 'text-[#835227]'
}) => {
  return (
    <Card className="flex items-center justify-between p-5 sm:p-6 border border-[#CBC6B2]/40 hover:border-[#835227]/50 transition-all group">
      <div className="flex-1 pr-3">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-1 font-medium leading-tight">{subtitle}</p>
        )}
      </div>
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 p-3 shadow-xs transition-transform group-hover:scale-105 ${iconBgColor} ${iconColor}`}>
        {icon}
      </div>
    </Card>
  );
};

