import React from 'react';
import { Settings, Save } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const PengaturanPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pengaturan Toko & Sistem</h2>
          <p className="text-xs text-slate-400">Profil Toko, Transaksi, Struk, dan Sistem</p>
        </div>
        <Button variant="primary" icon={<Save size={18} />}>
          Simpan Pengaturan
        </Button>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary mx-auto flex items-center justify-center mb-4">
          <Settings size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Modul Pengaturan (Phase 7)</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Pengaturan Profil Toko, Transaksi (format invoice, diskon/pajak optional), Struk nota, dan Sistem (IDR, Asia/Makassar, Bahasa Indonesia) disiapkan untuk Phase 7.
        </p>
      </Card>
    </div>
  );
};
