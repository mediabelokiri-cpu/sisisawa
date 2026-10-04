import React from 'react';
import { Package, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const ProdukPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Daftar Produk</h2>
          <p className="text-xs text-slate-400">Modul Manajemen Produk UMKM</p>
        </div>
        <Button variant="accent" icon={<Plus size={18} />}>
          Tambah Produk
        </Button>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary mx-auto flex items-center justify-center mb-4">
          <Package size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Modul Produk (Phase 3)</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Fitur manajemen produk, filter kategori, search, status AVAILABLE/UNAVAILABLE, dan detail produk disiapkan untuk Phase 3.
        </p>
      </Card>
    </div>
  );
};
