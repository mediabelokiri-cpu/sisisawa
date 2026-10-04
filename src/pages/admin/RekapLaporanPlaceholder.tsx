import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const RekapLaporanPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Rekap Laporan Bulanan</h2>
        <p className="text-xs text-slate-400">Analisis Performa Penjualan Bulanan</p>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary mx-auto flex items-center justify-center mb-4">
          <BarChart3 size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Modul Rekap Laporan Bulanan (Phase 5)</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Fitur rekap penjualan bulanan murni (total penjualan, item terjual, perbandingan bulan lalu, tanpa modul laba rugi/expense) disiapkan untuk Phase 5.
        </p>
      </Card>
    </div>
  );
};
