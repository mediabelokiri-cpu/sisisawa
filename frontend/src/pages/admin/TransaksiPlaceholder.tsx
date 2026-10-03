import React from 'react';
import { Receipt } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const TransaksiPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Daftar Seluruh Transaksi</h2>
        <p className="text-xs text-slate-400">Modul Transaksi & Histori Nota Penjualan</p>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary mx-auto flex items-center justify-center mb-4">
          <Receipt size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Modul Transaksi (Phase 4)</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Fitur pencarian invoice, filter kasir, filter tanggal, status Completed/Cancelled, dan cetak ulang nota disiapkan untuk Phase 4.
        </p>
      </Card>
    </div>
  );
};
