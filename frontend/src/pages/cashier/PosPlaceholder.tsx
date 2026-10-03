import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Clock,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  QrCode,
  CreditCard,
  Banknote,
  ArrowRight,
  X,
  User,
  Utensils,
  LayoutDashboard,
  Package
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Product, Category, TransactionDetail } from '../../types';
import { ReceiptPreview } from '../../components/ui/ReceiptPreview';
import { getCategoryIconComponent, getProduct2DIconData } from '../../utils/iconHelper';

interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

export const PosPlaceholder: React.FC = () => {
  const { user, storeProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);


  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available'>('all');

  // Order & Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Away'>('Dine In');
  const [tableNumber, setTableNumber] = useState<string>('Meja 01');
  const [personCount, setPersonCount] = useState<number>(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Time state (WITA Asia/Makassar)
  const [currentTime, setCurrentTime] = useState<string>('');

  // Payment Modal states
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS' | 'Debit' | 'Transfer'>('Cash');
  const [cashAmountPaid, setCashAmountPaid] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Receipt Modal states
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<TransactionDetail | null>(null);

  // Category horizontal scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Live Clock (Asia/Makassar)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const timeString = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(now);
        setCurrentTime(`${timeString} WITA`);
      } catch {
        setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, setRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/settings')
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (setRes.data.success) setSettings(setRes.data.data);
    } catch (err) {
      console.error('Error fetching POS data:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  // Format currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.status === 'UNAVAILABLE') return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Price calculations
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.sellPrice) * item.quantity, 0);
  const taxConfig = settings?.transaction_config;
  const isTaxEnabled = taxConfig?.enable_tax ?? false;
  const taxPercentage = taxConfig?.tax_percentage ?? 0;
  const taxAmount = isTaxEnabled ? subtotal * (taxPercentage / 100) : 0;
  const isRounding = taxConfig?.rounding ?? false;
  const totalBeforeRounding = subtotal + taxAmount;
  const grandTotal = isRounding ? Math.round(totalBeforeRounding / 500) * 500 : totalBeforeRounding;
  const roundingAmount = grandTotal - totalBeforeRounding;

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchAvailability = filterAvailability === 'all' || p.status === 'AVAILABLE';
    return matchQuery && matchCategory && matchAvailability;
  });

  // Category horizontal scroll buttons
  const scrollCategory = (dir: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = dir === 'left' ? -200 : 200;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Open Checkout Modal
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setCashAmountPaid(grandTotal);
    setCheckoutError('');
    setShowPaymentModal(true);
  };

  // Process Transaction Checkout
  const handleCompleteTransaction = async () => {
    if (paymentMethod === 'Cash' && cashAmountPaid < grandTotal) {
      setCheckoutError(`Nominal uang tunai kurang ${formatIDR(grandTotal - cashAmountPaid)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setCheckoutError('');

      const payload = {
        paymentMethod,
        payment_method: paymentMethod,
        discount: 0,
        tax: taxAmount,
        items: cart.map((item) => ({
          productId: item.product.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: Number(item.product.sellPrice)
        }))
      };

      const res = await api.post('/transactions', payload);
      if (res.data.success) {
        const txId = res.data.data.id || res.data.data.transaction_id;
        // Fetch transaction detail for receipt
        const detailRes = await api.get(`/transactions/${txId}`);
        if (detailRes.data.success) {
          setCompletedTransaction(detailRes.data.data);
        }

        setShowPaymentModal(false);
        setShowReceiptModal(true);
        clearCart();
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err.response?.data?.message || 'Gagal memproses transaksi. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFEFEF] text-slate-800 flex flex-col antialiased selection:bg-[#835227]/30">
      {/* 1. TOP GLOBAL NAVIGATION (Warm Roasted Brown #835227 Aesthetic) */}
      <header className="sticky top-0 z-30 bg-[#835227] text-white border-b border-[#6F441E] px-4 sm:px-6 lg:px-8 py-3.5 shadow-md shadow-[#835227]/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="SISISAWA Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white leading-tight">
                  {storeProfile?.name || 'SISISAWA'}
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#CBC6B2] text-[#3E2410] border border-white/20 shadow-xs">
                  Aplikasi Kasir
                </span>
              </div>
              <p className="text-[11px] text-[#CBC6B2] font-semibold hidden sm:block">
                Layar Kasir Interaktif & Cepat
              </p>
            </div>
          </div>

          {/* Search Bar (Pill Shape with White Contrast) */}
          <div className="flex-1 max-w-md mx-2 sm:mx-6">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-4 text-[#835227] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu lezat, minuman, atau kode..."
                className="w-full pl-11 pr-9 py-2.5 bg-white text-slate-900 placeholder-slate-400 border border-white/30 rounded-full text-xs sm:text-sm shadow-inner transition-all outline-none focus:ring-4 focus:ring-white/25"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Right Header: Clock, User Avatar, Admin Link & Cart Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Clock Pill (WITA) */}
            <div className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-black/20 backdrop-blur-xs border border-white/20 rounded-full text-xs font-bold text-white shadow-inner">
              <Clock size={14} className="text-[#CBC6B2]" />
              <span>{currentTime}</span>
            </div>

            {/* Quick Admin Panel Link (if role is ADMIN) */}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-white text-[#835227] hover:bg-[#CBC6B2] hover:text-[#3E2410] transition-all shadow-md active:scale-95 cursor-pointer"
                title="Buka Panel Admin"
              >
                <LayoutDashboard size={15} />
                <span>Admin Panel</span>
              </button>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
              </div>
              <div className="hidden lg:block text-left">
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[100px]">
                  {user?.name || 'Kasir'}
                </span>
                <span className="text-[10px] text-[#CBC6B2] font-black uppercase tracking-wider block">
                  {user?.role || 'KASIR'}
                </span>
              </div>
            </div>

            {/* Cart Trigger Badge (Pill button with item counter) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-[#835227] font-black text-xs shadow-md active:scale-95 transition-transform"
            >
              <ShoppingCart size={16} />
              <span>{totalItemCount}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT: CENTRAL CONTENT + RIGHT ORDER PANEL */}
      <div className="max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex-1 flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-6 items-start">
        {/* ================= LEFT / CENTRAL CONTENT ================= */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* A. SECTION HEADER & DINE-IN/TAKE-AWAY SWITCHER */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Katalog Menu & Produk</span>
                <span className="text-xl">🍔</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Pilih kategori untuk memfilter daftar produk
              </p>
            </div>

            {/* Quick availability filter pills */}
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-2xl">
              <button
                onClick={() => setFilterAvailability('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterAvailability === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterAvailability('available')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterAvailability === 'available'
                    ? 'bg-[#835227] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tersedia Saja
              </button>
            </div>
          </div>

          {/* C. CAPSULE PILL CATEGORY SELECTOR (Exact Chukwudi Style) */}
          <div className="relative group">
            {/* Left Scroll Button */}
            <button
              onClick={() => scrollCategory('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Scroll Kiri"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Categories Capsule Row */}
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
            >
              {/* "All" Capsule */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 w-20 h-28 rounded-3xl flex flex-col items-center justify-between p-3.5 transition-all duration-200 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#835227] text-white font-black shadow-lg shadow-[#835227]/30 scale-105 ring-2 ring-[#835227]/40'
                    : 'bg-white hover:bg-[#CBC6B2]/15 text-slate-700 font-bold border border-[#CBC6B2]/40 shadow-xs hover:border-[#835227]/50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Utensils size={20} />
                </div>
                <span className="text-xs truncate w-full text-center">Semua</span>
              </button>

              {/* Dynamic Category Capsules */}
              {categories.map((cat) => {
                const IconComponent = getCategoryIconComponent(cat.name, cat.icon);
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 w-20 h-28 rounded-3xl flex flex-col items-center justify-between p-3.5 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#835227] text-white font-black shadow-lg shadow-[#835227]/30 scale-105 ring-2 ring-[#835227]/40'
                        : 'bg-white hover:bg-[#CBC6B2]/15 text-slate-700 font-bold border border-[#CBC6B2]/40 shadow-xs hover:border-[#835227]/50'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white shadow-inner'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <IconComponent size={20} />
                    </div>
                    <span className="text-xs truncate w-full text-center">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Button */}
            <button
              onClick={() => scrollCategory('right')}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Scroll Kanan"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* D. PRODUCT CARDS GRID (3 Columns on Tablets/iPad & Desktop) */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white rounded-3xl p-3 sm:p-3.5 border border-slate-100 space-y-3 animate-pulse">
                    <div className="w-full h-32 sm:h-36 bg-slate-100 rounded-2xl" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-5 bg-slate-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#CBC6B2]/40 space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-[#835227]/10 text-[#835227] mx-auto flex items-center justify-center">
                  <Package size={28} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-800">Belum Ada Menu Produk</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Katalog produk masih kosong. Tambahkan kategori dan produk baru Anda melalui Panel Admin.
                  </p>
                </div>
                {user?.role === 'ADMIN' ? (
                  <button
                    onClick={() => navigate('/admin/produk')}
                    className="px-5 py-2.5 rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white text-xs font-bold shadow-md shadow-[#835227]/25 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Tambah Produk di Panel Admin</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Silakan hubungi Admin untuk menambahkan daftar menu produk.
                  </p>
                )}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100/80 space-y-3 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-[#835227]/10 text-[#835227] mx-auto flex items-center justify-center">
                  <Search size={28} />
                </div>
                <h4 className="text-base font-bold text-slate-800">Menu Tidak Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tidak ada produk yang cocok dengan filter atau kata kunci pencarian Anda.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setFilterAvailability('all');
                  }}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const isAvailable = product.status === 'AVAILABLE';
                  const cartItem = cart.find((i) => i.product.id === product.id);
                  const iconData = getProduct2DIconData(product);
                  const IconComponent = iconData.Icon;
                  const hasCustomImage = Boolean(product.imageUrl && product.imageUrl.trim() !== '');

                  return (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`group bg-white rounded-3xl p-3 sm:p-3.5 border border-[#CBC6B2]/40 hover:border-[#835227]/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden select-none active:scale-[0.98] ${
                        !isAvailable ? 'opacity-70 grayscale-[30%]' : ''
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      {/* Product Image / 2D Icon Container */}
                      <div className="relative w-full h-32 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 mb-2.5 select-none flex items-center justify-center">
                        {hasCustomImage ? (
                          <img
                            src={product.imageUrl!}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          /* Large 2D Icon Thumbnail - Centered, prominent, NO redundant inner text */
                          <div className={`w-full h-full bg-gradient-to-br ${iconData.bgGradient} flex items-center justify-center p-2.5 group-hover:scale-105 transition-transform duration-300 relative`}>
                            <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl ${iconData.badgeBg} border ${iconData.badgeBorder} shadow-xs flex items-center justify-center backdrop-blur-xs`}>
                              <IconComponent size={38} strokeWidth={1.8} className={iconData.iconColor} />
                            </div>
                          </div>
                        )}

                        {/* Top Prep-Time / Stock Badge */}
                        <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                          {isAvailable ? '15-20 min' : 'Habis'}
                        </div>

                        {/* In-Cart Quantity Indicator */}
                        {cartItem && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shadow-md animate-bounce">
                            {cartItem.quantity}
                          </div>
                        )}

                        {/* Unavailable Overlay */}
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2">
                            <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white font-black text-[10px] tracking-wider uppercase shadow-md">
                              Stok Habis
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-1 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-[#835227] transition-colors">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
                            <span className="text-[#835227] font-bold">⭐ 4.8</span>
                            <span>•</span>
                            <span className="truncate">{product.categoryName || 'Katalog'}</span>
                          </div>
                        </div>

                        {/* Price & Add Action Button */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100/60 mt-1.5">
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {formatIDR(Number(product.sellPrice))}
                          </span>

                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                              isAvailable
                                ? 'bg-[#835227]/10 hover:bg-[#835227] text-[#835227] hover:text-white font-bold shadow-xs active:scale-90'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            aria-label={`Tambah ${product.name}`}
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Floating Bottom Bar for Tablet Portrait & Mobile (<1024px) */}
        {cart.length > 0 && !isDrawerOpen && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom duration-200">
            <div
              onClick={() => setIsDrawerOpen(true)}
              className="p-3.5 sm:p-4 rounded-3xl bg-[#3E2410] text-white shadow-2xl flex items-center justify-between gap-3 border border-[#CBC6B2]/40 cursor-pointer active:scale-98 transition-transform"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#835227] flex items-center justify-center font-black text-sm text-white shadow-md">
                  {totalItemCount}
                </div>
                <div>
                  <p className="text-[11px] text-[#CBC6B2] font-bold uppercase tracking-wider leading-tight">
                    {orderType} • {tableNumber}
                  </p>
                  <p className="text-base font-black text-white leading-tight">
                    {formatIDR(grandTotal)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-black text-xs sm:text-sm shadow-md transition-all">
                <span>Lihat Pesanan & Bayar</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        )}

        {/* ================= RIGHT SIDEBAR: "MY ORDER / PESANAN KASIR" ================= */}
        {/* Responsive Desktop Side Panel & Mobile Drawer Container */}
        <div
          className={`lg:w-80 xl:w-92 shrink-0 ${
            isDrawerOpen
              ? 'fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs lg:static lg:bg-transparent lg:z-auto'
              : 'hidden lg:block'
          }`}
        >
          {/* Drawer Wrapper for Mobile / Floating Sidebar for Desktop */}
          <div
            className="w-full h-[90vh] lg:h-auto max-h-[calc(100vh-6rem)] lg:sticky lg:top-24 bg-white rounded-t-3xl lg:rounded-3xl border border-slate-100 shadow-xl lg:shadow-subtle-lg p-5 sm:p-6 flex flex-col justify-between overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Order Panel Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>Pesanan Kasir</span>
                    <span>🛒</span>
                  </h3>
                  {totalItemCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#CBC6B2]/30 text-[#835227] text-[11px] font-black">
                      {totalItemCount} item
                    </span>
                  )}
                </div>

                {/* Close button on Mobile Drawer / Clear Cart on Desktop */}
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Kosongkan Keranjang"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Order Mode & Table Selector Card (Warm Espresso #3E2410 Style) */}
              <div className="mt-4 p-4 rounded-2xl bg-[#3E2410] text-white shadow-md shadow-slate-900/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CBC6B2] animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#CBC6B2]">
                      {orderType}
                    </span>
                  </div>
                  <span className="text-xs text-white/80 font-medium">{currentTime}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrderType('Dine In')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        orderType === 'Dine In'
                          ? 'bg-[#835227] text-white shadow-xs'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      Dine In
                    </button>
                    <button
                      onClick={() => setOrderType('Take Away')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        orderType === 'Take Away'
                          ? 'bg-[#835227] text-white shadow-xs'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      Take Away
                    </button>
                  </div>

                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="No. Meja"
                    className="w-24 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 focus:bg-white focus:text-slate-900 rounded-xl text-xs font-bold text-center border border-white/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 my-4 overflow-y-auto no-scrollbar divide-y divide-slate-100 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-300 mx-auto flex items-center justify-center">
                    <ShoppingCart size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Keranjang Masih Kosong</p>
                  <p className="text-[11px] text-slate-400">
                    Klik menu pada katalog untuk menambahkan item.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const hasCustomImage = Boolean(item.product.imageUrl && item.product.imageUrl.trim() !== '');
                  const iconData = getProduct2DIconData(item.product);
                  const IconComponent = iconData.Icon;
                  const itemTotal = Number(item.product.sellPrice) * item.quantity;

                  return (
                    <div key={item.product.id} className="py-3 flex items-center gap-3">
                      {/* Image / 2D Icon Thumbnail */}
                      {hasCustomImage ? (
                        <img
                          src={item.product.imageUrl!}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconData.bgGradient} flex items-center justify-center shrink-0 border border-slate-100 shadow-xs`}>
                          <div className={`w-8 h-8 rounded-lg ${iconData.badgeBg} flex items-center justify-center ${iconData.iconColor}`}>
                            <IconComponent size={16} strokeWidth={2.2} />
                          </div>
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <h5 className="text-xs font-extrabold text-slate-800 truncate">
                            {item.product.name}
                          </h5>
                          <span className="text-xs font-black text-slate-900 shrink-0">
                            {formatIDR(itemTotal)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {formatIDR(Number(item.product.sellPrice))} / item
                        </p>

                        {/* Stepper Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-5 h-5 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-black text-slate-900 w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-5 h-5 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                            title="Hapus Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Financial Summary & Big CTA Button */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-700">{formatIDR(subtotal)}</span>
                </div>

                {isTaxEnabled && taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Pajak ({taxPercentage}%)</span>
                    <span className="font-bold text-slate-700">+{formatIDR(taxAmount)}</span>
                  </div>
                )}

                {isRounding && roundingAmount !== 0 && (
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Pembulatan</span>
                    <span className="font-bold text-slate-700">{formatIDR(roundingAmount)}</span>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-sm font-black text-slate-900">Total Biaya:</span>
                  <span className="text-xl font-black text-slate-950 tracking-tight">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Persons Stepper & Checkout CTA */}
              <div className="flex items-center gap-3">
                {/* Person Count Stepper */}
                <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-slate-100 text-xs font-bold text-slate-700">
                  <span className="text-slate-400 text-[11px]">Tamu:</span>
                  <button
                    onClick={() => setPersonCount(Math.max(1, personCount - 1))}
                    className="w-5 h-5 rounded-md bg-white hover:bg-slate-200 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-4 text-center font-black">{personCount}</span>
                  <button
                    onClick={() => setPersonCount(personCount + 1)}
                    className="w-5 h-5 rounded-md bg-white hover:bg-slate-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {/* Big Roasted Wood Checkout Button */}
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleOpenPayment}
                  className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                    cart.length > 0
                      ? 'bg-[#835227] hover:bg-[#6F441E] text-white shadow-[#835227]/30 hover:scale-[1.02] active:scale-95 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span>Bayar Sekarang</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. PAYMENT MODAL ================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-lg font-black text-slate-900">Penyelesaian Pembayaran</h4>
                <p className="text-xs text-slate-400">Pilih metode bayar dan masukkan nominal transaksi</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-2xl bg-[#CBC6B2]/20 border border-[#CBC6B2]/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#835227] block">Total Tagihan</span>
                <span className="text-2xl font-black text-slate-950">{formatIDR(grandTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 block">{orderType} • {tableNumber}</span>
                <span className="text-xs font-semibold text-[#835227]">{totalItemCount} Items</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Cash', label: 'Tunai', icon: Banknote },
                  { id: 'QRIS', label: 'QRIS', icon: QrCode },
                  { id: 'Debit', label: 'Debit', icon: CreditCard },
                  { id: 'Transfer', label: 'Transfer', icon: ArrowRight },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-[#835227] text-white shadow-md shadow-[#835227]/20'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Input & Quick Preset Chips */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Uang Diterima (Rp):
                  </label>
                  <input
                    type="number"
                    value={cashAmountPaid || ''}
                    onChange={(e) => setCashAmountPaid(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:bg-white focus:border-[#835227] outline-none"
                    placeholder="0"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCashAmountPaid(grandTotal)}
                    className="px-3 py-1.5 rounded-xl bg-[#CBC6B2]/30 hover:bg-[#CBC6B2]/50 text-[#835227] text-xs font-bold"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashAmountPaid(amt)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      {formatIDR(amt)}
                    </button>
                  ))}
                </div>

                {/* Change Calculation */}
                <div className="p-3.5 rounded-xl bg-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Kembalian:</span>
                  <span
                    className={`text-base font-black ${
                      cashAmountPaid >= grandTotal ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {cashAmountPaid >= grandTotal
                      ? formatIDR(cashAmountPaid - grandTotal)
                      : `Kurang ${formatIDR(grandTotal - cashAmountPaid)}`}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS Simulator View */}
            {paymentMethod === 'QRIS' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-xs border border-slate-200 mx-auto flex items-center justify-center">
                  <QrCode size={110} className="text-slate-900" />
                </div>
                <p className="text-xs font-bold text-slate-700">Scan QRIS Kasirku</p>
                <p className="text-[11px] text-slate-400">
                  Dukung GoPay, OVO, Dana, ShopeePay & Mobile Banking
                </p>
              </div>
            )}

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting || (paymentMethod === 'Cash' && cashAmountPaid < grandTotal)}
                onClick={handleCompleteTransaction}
                className="flex-1 py-3 px-4 rounded-2xl font-black text-xs bg-[#835227] hover:bg-[#6F441E] text-white shadow-md shadow-[#835227]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Konfirmasi & Cetak</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. RECEIPT MODAL (Thermal Receipt 58mm/80mm & Cashcow Driver) ================= */}
      {showReceiptModal && completedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-1">
                <CheckCircle2 size={26} />
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900">Transaksi Berhasil Disimpan!</h4>
              <p className="text-xs text-slate-400 font-medium">
                No. Nota: <strong className="text-slate-800">{completedTransaction.transaction.invoiceNumber || completedTransaction.transaction.invoice_number}</strong>
              </p>
            </div>

            {/* Embedded Receipt Component with Thermal 58mm/80mm & Cashcow Bluetooth/System print */}
            <div className="max-h-[62vh] overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/60">
              <ReceiptPreview
                detail={completedTransaction}
                showActions={true}
                onClose={() => {
                  setShowReceiptModal(false);
                  setCompletedTransaction(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

