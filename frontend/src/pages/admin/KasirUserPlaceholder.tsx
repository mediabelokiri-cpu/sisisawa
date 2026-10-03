import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const KasirUserPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Kasir & Pengguna</h2>
          <p className="text-xs text-slate-400">Pengaturan Hak Akses (ADMIN & KASIR)</p>
        </div>
        <Button variant="accent" icon={<UserPlus size={18} />}>
          Tambah Pengguna
        </Button>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary mx-auto flex items-center justify-center mb-4">
          <Users size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Modul Kasir / User (Phase 6)</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Fitur kelola pengguna (hanya peran ADMIN & KASIR, status Active/Inactive, reset password) disiapkan untuk Phase 6.
        </p>
      </Card>
    </div>
  );
};
