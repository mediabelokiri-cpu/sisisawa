import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Upload
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Product, Category, ProductStatus } from '../../types';
import { AVAILABLE_2D_ICONS, getProduct2DIconData } from '../../utils/iconHelper';

export const Produk: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'icon'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    buyPrice: '',
    sellPrice: '',
    imageUrl: '',
    icon: '',
    sku: '',
    status: 'AVAILABLE' as ProductStatus
  });
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal State for Detail
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modal State for Delete
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/products?search=${encodeURIComponent(searchQuery)}`;
      if (selectedCategory !== 'all') {
        url += `&category_id=${selectedCategory}`;
      }
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch products error:', err);
      setError('Gagal memuat daftar produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, statusFilter]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      buyPrice: '',
      sellPrice: '',
      imageUrl: '',
      icon: '',
      sku: '',
      status: 'AVAILABLE'
    });
    setImageInputMode('upload');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    const hasImage = Boolean(prod.imageUrl && prod.imageUrl.trim() !== '');
    setFormData({
      name: prod.name,
      categoryId: String(prod.categoryId),
      buyPrice: prod.buyPrice !== null ? String(prod.buyPrice) : '',
      sellPrice: String(prod.sellPrice),
      imageUrl: prod.imageUrl || '',
      icon: prod.icon || '',
      sku: prod.sku || '',
      status: prod.status
    });
    if (hasImage) {
      setImageInputMode(prod.imageUrl?.startsWith('data:') ? 'upload' : 'url');
    } else if (prod.icon) {
      setImageInputMode('icon');
    } else {
      setImageInputMode('upload');
    }
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setFormError('Ukuran file foto maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        imageUrl: reader.result as string
      }));
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama produk wajib diisi.');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Kategori produk wajib dipilih.');
      return;
    }
    if (!formData.sellPrice || isNaN(Number(formData.sellPrice)) || Number(formData.sellPrice) < 0) {
      setFormError('Harga jual wajib diisi angka valid.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        name: formData.name.trim(),
        categoryId: Number(formData.categoryId),
        buyPrice: formData.buyPrice ? Number(formData.buyPrice) : null,
        sellPrice: Number(formData.sellPrice),
        imageUrl: formData.imageUrl.trim() || null,
        icon: formData.icon ? formData.icon.trim() : null,
        sku: formData.sku.trim() || null,
        status: formData.status
      };

      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, payload);
        if (res.data.success) {
          showNotification('Produk berhasil diperbarui.');
          setIsFormModalOpen(false);
          fetchProducts();
        }
      } else {
        const res = await api.post('/products', payload);
        if (res.data.success) {
          showNotification('Produk baru berhasil ditambahkan.');
          setIsFormModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan produk.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = prod.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    try {
      const res = await api.patch(`/products/${prod.id}/status`, { status: newStatus });
      if (res.data.success) {
        showNotification(`Status "${prod.name}" diubah menjadi ${newStatus}`);
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, status: newStatus } : p))
        );
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Gagal mengubah status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      setIsDeleting(true);
      setDeleteError('');
      const res = await api.delete(`/products/${deletingProduct.id}`);
      if (res.data.success) {
        showNotification(res.data.message || 'Produk berhasil dihapus.');
        setDeletingProduct(null);
        fetchProducts();
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus produk.');
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const formatIDR = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#CBC6B2]/40 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#835227]/10 flex items-center justify-center text-[#835227]">
              <Package size={20} />
            </div>
            <span>Kelola Produk & Menu 📦</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Kelola katalog produk, foto / ikon 2D, harga jual, dan ketersediaan di kasir
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={fetchProducts}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Produk"
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
            Tambah Produk
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

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Cari nama produk atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Kategori' },
                ...categories.map((c) => ({ value: String(c.id), label: c.name }))
              ]}
            />
          </div>

          {/* View Mode & Reset Filter */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Status Pills */}
            <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold flex-1 sm:flex-initial transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-[#835227] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold flex-1 sm:flex-initial transition-all ${
                  statusFilter === 'AVAILABLE'
                    ? 'bg-[#835227] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setStatusFilter('UNAVAILABLE')}
                className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold flex-1 sm:flex-initial transition-all ${
                  statusFilter === 'UNAVAILABLE'
                    ? 'bg-[#835227] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unavailable
              </button>
            </div>

            {/* Grid / Table Toggle */}
            <div className="hidden lg:inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 min-h-[38px] min-w-[38px] rounded-xl ${
                  viewMode === 'grid' ? 'bg-white text-[#835227] shadow-xs font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 min-h-[38px] min-w-[38px] rounded-xl ${
                  viewMode === 'table' ? 'bg-white text-[#835227] shadow-xs font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <TableIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Product Content List */}
      {loading && products.length === 0 ? (
        <LoadingSpinner size="lg" label="Memuat katalog produk..." />
      ) : products.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl border border-[#CBC6B2]/40">
          <div className="w-16 h-16 rounded-2xl bg-[#835227]/10 text-[#835227] mx-auto flex items-center justify-center mb-3">
            <Package size={32} />
          </div>
          <h3 className="text-base font-black text-slate-800 mb-1">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'ALL'
              ? 'Tidak Ada Produk yang Cocok'
              : 'Belum Ada Produk'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'ALL'
              ? 'Coba ubah kata kunci pencarian atau filter status/kategori.'
              : 'Mulai dengan menambahkan produk pertama Anda ke dalam sistem POS.'}
          </p>
          <Button variant="accent" onClick={handleOpenAdd} icon={<Plus size={16} />} className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white">
            Tambah Produk Sekarang
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => {
            const hasCustomImage = Boolean(p.imageUrl && p.imageUrl.trim() !== '');
            const iconData = getProduct2DIconData(p);
            const IconComponent = iconData.Icon;

            return (
              <Card
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="group flex flex-col justify-between p-4 rounded-3xl border-[#CBC6B2]/40 hover:border-[#835227]/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div>
                  {/* Image Container & Status Badge */}
                  <div className="relative aspect-video rounded-2xl bg-slate-100 overflow-hidden mb-3.5 flex items-center justify-center select-none">
                    {hasCustomImage ? (
                      <img src={p.imageUrl!} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      /* Large 2D Icon Thumbnail - Centered, prominent, NO inner text label */
                      <div className={`w-full h-full bg-gradient-to-br ${iconData.bgGradient} flex items-center justify-center p-3 group-hover:scale-105 transition-transform duration-300 relative`}>
                        <div className={`w-16 h-16 rounded-2xl ${iconData.badgeBg} border ${iconData.badgeBorder} flex items-center justify-center backdrop-blur-xs shadow-xs`}>
                          <IconComponent size={36} strokeWidth={1.8} className={iconData.iconColor} />
                        </div>
                      </div>
                    )}

                    {/* Status Badge overlay */}
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant={p.status === 'AVAILABLE' ? 'success' : 'danger'}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-[#835227] uppercase tracking-wider block truncate">
                      {p.categoryName}
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 truncate" title={p.name}>
                      {p.name}
                    </h3>
                    {p.sku && (
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {p.sku}</p>
                    )}
                  </div>

                  {/* Price & Profit */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Harga Jual</span>
                      <span className="text-base font-black text-slate-900">
                        {formatIDR(p.sellPrice)}
                      </span>
                    </div>

                    {p.profit !== null && (
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block font-medium">Margin Profit</span>
                        <span className="text-xs font-bold text-emerald-600">
                          +{formatIDR(p.profit)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleStatus(p)}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      p.status === 'AVAILABLE'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {p.status === 'AVAILABLE' ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                      title="Edit Produk"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError('');
                        setDeletingProduct(p);
                      }}
                      className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors"
                      title="Hapus Produk"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="p-0 overflow-hidden rounded-3xl border-[#CBC6B2]/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">Produk</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4 text-right">Harga Beli</th>
                  <th className="py-3.5 px-4 text-right">Harga Jual</th>
                  <th className="py-3.5 px-4 text-right">Keuntungan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((p) => {
                  const iconData = getProduct2DIconData(p);
                  const Icon = iconData.Icon;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 overflow-hidden border border-slate-200/60">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon size={20} className={iconData.iconColor} />
                            )}
                          </div>
                          <span className="font-bold text-slate-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {p.categoryName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {p.sku || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">
                        {formatIDR(p.buyPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#835227]">
                        {formatIDR(p.sellPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {p.profit !== null ? `+${formatIDR(p.profit)}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleStatus(p, e)}
                          className="transition-transform active:scale-95 cursor-pointer"
                        >
                          <Badge variant={p.status === 'AVAILABLE' ? 'success' : 'danger'}>
                            {p.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedProduct(p)}
                            className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Edit Produk"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError('');
                              setDeletingProduct(p);
                            }}
                            className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL DETAIL PRODUK */}
      {selectedProduct && (
        <Modal
          isOpen={selectedProduct !== null}
          onClose={() => setSelectedProduct(null)}
          title="Detail Produk"
          maxWidth="md"
        >
          <div className="space-y-5">
            {/* Image Preview */}
            <div className="aspect-video w-full rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (() => {
                  const iconData = getProduct2DIconData(selectedProduct);
                  const Icon = iconData.Icon;
                  return (
                    <div className={`w-full h-full bg-gradient-to-br ${iconData.bgGradient} flex items-center justify-center`}>
                      <div className={`w-20 h-20 rounded-2xl ${iconData.badgeBg} border ${iconData.badgeBorder} flex items-center justify-center`}>
                        <Icon size={44} className={iconData.iconColor} />
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#835227] uppercase tracking-wider">
                  {selectedProduct.categoryName}
                </span>
                <h3 className="text-xl font-black text-slate-900">{selectedProduct.name}</h3>
                {selectedProduct.sku && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {selectedProduct.sku}</p>
                )}
              </div>
              <Badge variant={selectedProduct.status === 'AVAILABLE' ? 'success' : 'danger'}>
                {selectedProduct.status}
              </Badge>
            </div>

            {/* Financial breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Harga Beli (Modal)</span>
                <span className="font-semibold text-slate-700">
                  {selectedProduct.buyPrice !== null ? formatIDR(selectedProduct.buyPrice) : 'Tidak diset'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Harga Jual</span>
                <span className="font-black text-[#835227] text-base">
                  {formatIDR(selectedProduct.sellPrice)}
                </span>
              </div>
              {selectedProduct.profit !== null && (
                <div className="flex justify-between pt-2 border-t border-dashed border-slate-200">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-emerald-600" />
                    Keuntungan per item
                  </span>
                  <span className="font-extrabold text-emerald-600 text-base">
                    +{formatIDR(selectedProduct.profit)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedProduct(null)}
                className="rounded-2xl"
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                icon={<Edit2 size={16} />}
                className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white"
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  handleOpenEdit(p);
                }}
              >
                Edit Produk Ini
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL FORM TAMBAH / EDIT PRODUK */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Nama Produk */}
          <Input
            label="Nama Produk *"
            placeholder="Contoh: Kopi Susu Aren 250ml"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kategori */}
            <Select
              label="Kategori *"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={[
                { value: '', label: '-- Pilih Kategori --' },
                ...categories.map((c) => ({ value: String(c.id), label: c.name }))
              ]}
              required
            />

            {/* Status (AVAILABLE / UNAVAILABLE) */}
            <Select
              label="Status Ketersediaan *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
              options={[
                { value: 'AVAILABLE', label: 'AVAILABLE (Tampil di Kasir)' },
                { value: 'UNAVAILABLE', label: 'UNAVAILABLE (Sembunyikan dari Kasir)' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Harga Beli (Optional) */}
            <Input
              label="Harga Beli (Modal) - Opsional"
              type="number"
              placeholder="Contoh: 8000 (boleh kosong)"
              value={formData.buyPrice}
              onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
              min="0"
            />

            {/* Harga Jual */}
            <Input
              label="Harga Jual *"
              type="number"
              placeholder="Contoh: 15000"
              value={formData.sellPrice}
              onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
              min="0"
              required
            />
          </div>

          {/* SKU */}
          <Input
            label="SKU (Kode Produk) - Opsional"
            placeholder="Contoh: KOP-001"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          />

          {/* PILIHAN VISUAL PRODUK (UPLOAD FOTO / URL / IKON 2D) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-800">
                Visual Menu / Produk Kasir
              </label>
              <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    imageInputMode === 'upload'
                      ? 'bg-white text-[#835227] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    imageInputMode === 'url'
                      ? 'bg-white text-[#835227] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Link URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('icon')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    imageInputMode === 'icon'
                      ? 'bg-white text-[#835227] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pilih Ikon 2D
                </button>
              </div>
            </div>

            {/* TAB 1: UPLOAD FILE */}
            {imageInputMode === 'upload' && (
              <div className="space-y-2">
                {formData.imageUrl && formData.imageUrl.startsWith('data:image') ? (
                  <div className="relative rounded-2xl border border-slate-200 p-3 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">Foto Siap Digunakan</p>
                        <p className="text-[11px] text-emerald-600 font-bold">Akan tampil di layar kasir</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#835227] rounded-2xl p-4 text-center cursor-pointer bg-slate-50/60 hover:bg-[#CBC6B2]/10 transition-colors"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                    />
                    <div className="w-9 h-9 rounded-full bg-[#835227]/10 text-[#835227] mx-auto flex items-center justify-center mb-1.5">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Klik untuk memilih file foto produk</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Mendukung format PNG, JPG, JPEG, WEBP (Maks 3MB)</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: URL FOTO */}
            {imageInputMode === 'url' && (
              <div className="space-y-2">
                <Input
                  placeholder="https://domain.com/foto-produk.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                {formData.imageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                    <p className="text-xs text-slate-500 truncate flex-1">{formData.imageUrl}</p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="text-xs text-rose-500 font-bold hover:underline px-2 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PILIH IKON 2D */}
            {imageInputMode === 'icon' && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 font-medium">
                  Pilih ikon 2D visual untuk menu yang belum memiliki foto asli:
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {AVAILABLE_2D_ICONS.map((opt) => {
                    const Icon = opt.Icon;
                    const isSelected = formData.icon === opt.id || (!formData.icon && !formData.imageUrl && getProduct2DIconData({ name: formData.name, categoryName: categories.find(c => String(c.id) === formData.categoryId)?.name }).id === opt.id);

                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          setFormData({ ...formData, icon: opt.id, imageUrl: '' });
                        }}
                        className={`p-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#835227] text-white border-[#835227] shadow-md shadow-[#835227]/25 scale-102 font-bold ring-2 ring-[#835227]/30'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : `${opt.badgeBg} ${opt.iconColor}`}`}>
                          <Icon size={18} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] truncate w-full text-center leading-tight">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG HAPUS PRODUK */}
      {deletingProduct && (
        <ConfirmDialog
          isOpen={deletingProduct !== null}
          onClose={() => {
            setDeletingProduct(null);
            setDeleteError('');
          }}
          onConfirm={handleConfirmDelete}
          title="Hapus Produk"
          message={
            deleteError ? (
              <div className="text-rose-600 font-medium">
                {deleteError}
              </div>
            ) : (
              <div>
                Apakah Anda yakin ingin menghapus produk <strong>"{deletingProduct.name}"</strong>?
              </div>
            )
          }
          confirmText={deleteError ? 'Mengerti' : 'Ya, Hapus Produk'}
          variant="danger"
          loading={isDeleting}
        />
      )}
    </div>
  );
};
