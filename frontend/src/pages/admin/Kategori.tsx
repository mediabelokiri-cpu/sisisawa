import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Category } from '../../types';
import { getCategoryIconComponent, AVAILABLE_2D_ICONS } from '../../utils/iconHelper';

export const Kategori: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Modal State for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryIcon, setCategoryIcon] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal State for Delete
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/categories?search=${encodeURIComponent(searchQuery)}`);
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch categories error:', err);
      setError('Gagal memuat daftar kategori.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryIcon('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryIcon(cat.icon || '');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setFormError('Nama kategori tidak boleh kosong.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        name: categoryName.trim(),
        icon: categoryIcon || null
      };

      if (editingCategory) {
        // Update
        const res = await api.put(`/categories/${editingCategory.id}`, payload);
        if (res.data.success) {
          showNotification('Kategori berhasil diperbarui.');
          setIsFormModalOpen(false);
          fetchCategories();
        }
      } else {
        // Create
        const res = await api.post('/categories', payload);
        if (res.data.success) {
          showNotification('Kategori baru berhasil ditambahkan.');
          setIsFormModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan kategori.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      setIsDeleting(true);
      setDeleteError('');
      const res = await api.delete(`/categories/${deletingCategory.id}`);
      if (res.data.success) {
        showNotification(res.data.message || 'Kategori berhasil dihapus.');
        setDeletingCategory(null);
        fetchCategories();
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus kategori.');
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#CBC6B2]/40 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#835227]/10 flex items-center justify-center text-[#835227]">
              <FolderTree size={20} />
            </div>
            <span>Kelola Kategori Produk 📁</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Kelola pengelompokan menu makanan & minuman pada layar kasir
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={fetchCategories}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Kategori"
            className="rounded-2xl"
          >
            Segarkan
          </Button>

          <Button
            variant="accent"
            size="md"
            onClick={handleOpenAdd}
            icon={<Plus size={18} />}
            className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-black shadow-md shadow-[#835227]/20"
          >
            Tambah Kategori
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs font-bold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs font-bold">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-4 rounded-3xl border border-[#CBC6B2]/40">
        <div className="max-w-md">
          <Input
            placeholder="Cari nama kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
      </Card>

      {/* Categories Grid (Tablet-First Responsive Cards) */}
      {loading && categories.length === 0 ? (
        <LoadingSpinner size="lg" label="Memuat data kategori..." />
      ) : categories.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl border border-[#CBC6B2]/40">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-3">
            <FolderTree size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">
            {searchQuery ? 'Kategori Tidak Ditemukan' : 'Belum Ada Kategori'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `Tidak ada kategori yang cocok dengan kata kunci "${searchQuery}".`
              : 'Silakan tambahkan kategori baru untuk mulai mengelompokkan produk Anda.'}
          </p>
          {!searchQuery && (
            <Button variant="accent" onClick={handleOpenAdd} icon={<Plus size={16} />} className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white">
              Tambah Kategori Sekarang
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat) => {
            const IconComponent = getCategoryIconComponent(cat.name, cat.icon);

            return (
              <Card
                key={cat.id}
                className="p-5 sm:p-6 flex flex-col justify-between hover:shadow-md transition-all border-[#CBC6B2]/40 hover:border-[#835227]/50 rounded-3xl group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#835227]/10 text-[#835227] border border-[#835227]/20 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <IconComponent size={22} className="text-[#835227]" />
                    </div>

                    {/* Counter Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CBC6B2]/20 text-[#835227] border border-[#CBC6B2]/60 text-xs font-black">
                      <Package size={14} className="text-[#835227]" />
                      <span>{cat.product_count} Produk</span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1 truncate">{cat.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {cat.product_count > 0
                      ? `Digunakan oleh ${cat.product_count} produk aktif`
                      : 'Belum ada produk yang terhubung'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(cat)}
                    icon={<Edit2 size={16} />}
                    className="rounded-xl text-slate-700 hover:text-[#835227]"
                  >
                    Edit
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeletingCategory(cat)}
                    icon={<Trash2 size={16} />}
                    className="rounded-xl"
                  >
                    Hapus
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT KATEGORI */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Nama Kategori *"
            placeholder="Contoh: Hot Drink, Ice Drink, Makanan, Snack"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
            autoFocus
          />

          {/* Icon Picker for Category */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800">
                Ikon Kategori (Opsional)
              </label>
              <span className="text-[10px] text-slate-400">
                {categoryIcon ? 'Ikon Khusus Terpilih' : 'Otomatis Sesuai Nama'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
              {AVAILABLE_2D_ICONS.map((opt) => {
                const Icon = opt.Icon;
                const isSelected = categoryIcon === opt.id || (!categoryIcon && getCategoryIconComponent(categoryName) === opt.Icon);

                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => {
                      setCategoryIcon(categoryIcon === opt.id ? '' : opt.id);
                    }}
                    className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#835227] text-white border-[#835227] shadow-xs scale-102 font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : `${opt.badgeBg} ${opt.iconColor}`}`}>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <span className="text-[9px] truncate w-full text-center leading-tight">
                      {opt.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            * Ikon akan otomatis disesuaikan secara pintar berdasarkan nama kategori jika Anda tidak memilih ikon khusus.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
              className="rounded-2xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              loading={submitting}
              className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-black shadow-md shadow-[#835227]/20"
            >
              {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG HAPUS KATEGORI */}
      {deletingCategory && (
        <ConfirmDialog
          isOpen={deletingCategory !== null}
          onClose={() => {
            setDeletingCategory(null);
            setDeleteError('');
          }}
          onConfirm={handleConfirmDelete}
          title="Hapus Kategori"
          message={
            deleteError ? (
              <div className="text-rose-600 font-medium">
                {deleteError}
              </div>
            ) : (
              <div>
                Apakah Anda yakin ingin menghapus kategori <strong>"{deletingCategory.name}"</strong>?
                {deletingCategory.product_count > 0 && (
                  <p className="mt-2 text-rose-600 font-medium text-xs">
                    Peringatan: Kategori ini masih memiliki {deletingCategory.product_count} produk dan tidak dapat dihapus sebelum produk dipindahkan.
                  </p>
                )}
              </div>
            )
          }
          confirmText={deleteError ? 'Mengerti' : 'Ya, Hapus Kategori'}
          variant="danger"
          loading={isDeleting}
        />
      )}
    </div>
  );
};
