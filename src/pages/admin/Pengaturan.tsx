import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Store,
  Receipt,
  Sliders,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Percent,
  Clock,
  Tablet,
  Smartphone,
  Download,
  Sparkles,
  Share,
  PlusSquare,
  ShoppingCart
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import {
  isStandaloneMode,
  isAppleDevice,
  getDeferredPrompt,
  triggerPWAInstall
} from '../../utils/pwaHelper';

export const Pengaturan: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'transaction' | 'receipt' | 'system' | 'tablet'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // PWA & Tablet Install States
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // 1. Profil Toko State
  const [storeProfile, setStoreProfile] = useState({
    name: 'Toko Berkah Sejahtera',
    address: 'Jl. Ahmad Yani No. 45, Makassar',
    phone: '081234567890',
    whatsapp: '081234567890',
    logo: ''
  });

  // 2. Transaksi State
  const [transactionConfig, setTransactionConfig] = useState({
    invoice_prefix: 'INV-',
    default_discount: 0,
    enable_tax: false,
    tax_percentage: 11,
    rounding: false
  });

  // 3. Struk State
  const [receiptConfig, setReceiptConfig] = useState({
    header: 'TOKO BERKAH SEJAHTERA',
    address: 'Jl. Ahmad Yani No. 45, Makassar',
    footer: 'Terima Kasih Telah Berbelanja!',
    show_cashier: true,
    show_datetime: true,
    paper_size: '58mm' as '58mm' | '80mm'
  });

  // 4. Sistem State
  const [systemConfig, setSystemConfig] = useState({
    language: 'id',
    currency: 'IDR',
    timezone: 'Asia/Makassar'
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/settings');
      if (res.data.success) {
        const d = res.data.data;
        if (d.store_profile) setStoreProfile((prev) => ({ ...prev, ...d.store_profile }));
        if (d.transaction_config) setTransactionConfig((prev) => ({ ...prev, ...d.transaction_config }));
        if (d.receipt_config) setReceiptConfig((prev) => ({ ...prev, ...d.receipt_config }));
        if (d.system_config) setSystemConfig((prev) => ({ ...prev, ...d.system_config }));
      }
    } catch (err: any) {
      console.error('Fetch settings error:', err);
      setError('Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Check PWA & device status
    setIsStandalone(isStandaloneMode());
    setIsIOS(isAppleDevice());

    const handlePromptAvailable = () => {
      // Re-trigger re-render if deferredPrompt becomes available
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      showNotification('Aplikasi SISISAWA berhasil dipasang di perangkat!');
    });

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
    };
  }, []);

  const handleInstallTablet = async () => {
    if (isStandalone) {
      showNotification('Aplikasi SISISAWA sudah terpasang dan aktif di perangkat ini.');
      setIsInstallModalOpen(true);
      return;
    }

    if (getDeferredPrompt()) {
      const outcome = await triggerPWAInstall();
      if (outcome === 'accepted') {
        showNotification('Aplikasi SISISAWA sedang dipasang ke layar tablet...');
        setIsStandalone(true);
        setIsInstallModalOpen(false);
        return;
      }
    }

    // Open guide modal if deferred prompt is not directly available or on iOS/iPadOS
    setIsInstallModalOpen(true);
  };

  const handleSaveCurrentSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'tablet') return;

    try {
      setSaving(true);
      setError('');

      let key = 'store_profile';
      let payload: any = storeProfile;

      if (activeTab === 'profile') {
        key = 'store_profile';
        payload = storeProfile;
        if (!storeProfile.name.trim()) {
          setError('Nama Toko wajib diisi.');
          setSaving(false);
          return;
        }
      } else if (activeTab === 'transaction') {
        key = 'transaction_config';
        payload = transactionConfig;
      } else if (activeTab === 'receipt') {
        key = 'receipt_config';
        payload = receiptConfig;
      } else if (activeTab === 'system') {
        key = 'system_config';
        payload = systemConfig;
      }

      const res = await api.put(`/settings/${key}`, payload);
      if (res.data.success) {
        showNotification(`Pengaturan ${getTabLabel(activeTab)} berhasil disimpan.`);
        // Refresh globally so Header & Sidebar update immediately if store name changed
        await refreshProfile();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const getTabLabel = (tabKey: string) => {
    switch (tabKey) {
      case 'profile':
        return 'Profil Toko';
      case 'transaction':
        return 'Transaksi';
      case 'receipt':
        return 'Struk Kasir';
      case 'system':
        return 'Sistem';
      case 'tablet':
        return 'Aplikasi Tablet';
      default:
        return 'Pengaturan';
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#CBC6B2]/40 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#2B1E16] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#835227]/10 flex items-center justify-center text-[#835227]">
              <Settings size={20} />
            </div>
            <span>Pengaturan Toko & Sistem ⚙️</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Kelola profil toko, format nota, parameter transaksi, dan preferensi sistem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tombol Install untuk Tablet di Header */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleInstallTablet}
            icon={<Tablet size={18} className="text-white" />}
            className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-bold shadow-md shadow-[#835227]/25 transition-all active:scale-95 cursor-pointer"
          >
            <span className="hidden sm:inline">Install untuk Tablet</span>
            <span className="sm:hidden">Install Tablet</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={fetchSettings}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Pengaturan"
            className="rounded-2xl"
          >
            Segarkan
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

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#835227] text-white font-black shadow-md shadow-[#835227]/25 scale-102'
              : 'bg-white text-slate-600 hover:bg-[#CBC6B2]/20 border border-[#CBC6B2]/40 shadow-xs'
          }`}
        >
          <Store size={18} />
          <span>Profil Toko</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transaction')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'transaction'
              ? 'bg-[#835227] text-white font-black shadow-md shadow-[#835227]/25 scale-102'
              : 'bg-white text-slate-600 hover:bg-[#CBC6B2]/20 border border-[#CBC6B2]/40 shadow-xs'
          }`}
        >
          <Sliders size={18} />
          <span>Transaksi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipt')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'receipt'
              ? 'bg-[#835227] text-white font-black shadow-md shadow-[#835227]/25 scale-102'
              : 'bg-white text-slate-600 hover:bg-[#CBC6B2]/20 border border-[#CBC6B2]/40 shadow-xs'
          }`}
        >
          <Receipt size={18} />
          <span>Struk Kasir</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'system'
              ? 'bg-[#835227] text-white font-black shadow-md shadow-[#835227]/25 scale-102'
              : 'bg-white text-slate-600 hover:bg-[#CBC6B2]/20 border border-[#CBC6B2]/40 shadow-xs'
          }`}
        >
          <Globe size={18} />
          <span>Sistem</span>
        </button>

        {/* Tab Baru Khusus Tablet */}
        <button
          type="button"
          onClick={() => setActiveTab('tablet')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'tablet'
              ? 'bg-[#835227] text-white font-black shadow-md shadow-[#835227]/25 scale-102'
              : 'bg-white text-slate-600 hover:bg-[#CBC6B2]/20 border border-[#CBC6B2]/40 shadow-xs'
          }`}
        >
          <Tablet size={18} />
          <span>Aplikasi Tablet</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" label="Memuat pengaturan..." />
      ) : (
        <form onSubmit={handleSaveCurrentSection} className="space-y-6">
          {/* TAB 1: PROFIL TOKO */}
          {activeTab === 'profile' && (
            <Card className="p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Store size={20} className="text-brand-primary" />
                  <span>Profil & Informasi Toko UMKM</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informasi ini ditampilkan pada Header aplikasi dan identitas nota belanja
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Nama Toko *"
                    placeholder="Contoh: Toko Berkah Sejahtera"
                    value={storeProfile.name}
                    onChange={(e) => setStoreProfile({ ...storeProfile, name: e.target.value })}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Alamat Lengkap Toko
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-pos text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-brand-secondary/40 focus:border-brand-primary"
                    placeholder="Contoh: Jl. Ahmad Yani No. 45, Makassar"
                    value={storeProfile.address}
                    onChange={(e) => setStoreProfile({ ...storeProfile, address: e.target.value })}
                  />
                </div>

                <Input
                  label="Nomor Telepon"
                  placeholder="Contoh: 081234567890"
                  value={storeProfile.phone}
                  onChange={(e) => setStoreProfile({ ...storeProfile, phone: e.target.value })}
                />

                <Input
                  label="Nomor WhatsApp"
                  placeholder="Contoh: 081234567890"
                  value={storeProfile.whatsapp}
                  onChange={(e) => setStoreProfile({ ...storeProfile, whatsapp: e.target.value })}
                />

                <div className="sm:col-span-2">
                  <Input
                    label="URL Logo Toko (Opsional)"
                    placeholder="https://... atau biarkan kosong"
                    value={storeProfile.logo || ''}
                    onChange={(e) => setStoreProfile({ ...storeProfile, logo: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* TAB 2: TRANSAKSI */}
          {activeTab === 'transaction' && (
            <Card className="p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sliders size={20} className="text-brand-primary" />
                  <span>Konfigurasi Parameter Transaksi</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur format nomor invoice nota, pajak, dan opsi pembulatan transaksi
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Invoice Prefix */}
                <Input
                  label="Format Awalan (Prefix) Invoice"
                  placeholder="Contoh: INV-"
                  value={transactionConfig.invoice_prefix}
                  onChange={(e) =>
                    setTransactionConfig({ ...transactionConfig, invoice_prefix: e.target.value })
                  }
                  helperText="Prefix digunakan di awal nomor nota transaksi (misal: INV-20260905-1234)"
                />

                {/* Pajak Toggle & Percentage */}
                <div className="p-4 rounded-pos bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">Pajak Penjualan (Tax)</span>
                      <span className="text-xs text-slate-400">
                        Aktifkan jika harga transaksi dikenakan pajak tambahan (misal PPN 11%)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transactionConfig.enable_tax}
                        onChange={(e) =>
                          setTransactionConfig({ ...transactionConfig, enable_tax: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>

                  {transactionConfig.enable_tax && (
                    <div className="pt-2 border-t border-slate-200">
                      <Input
                        label="Tarif Pajak (%)"
                        type="number"
                        min="0"
                        max="100"
                        value={String(transactionConfig.tax_percentage)}
                        onChange={(e) =>
                          setTransactionConfig({
                            ...transactionConfig,
                            tax_percentage: Number(e.target.value) || 0
                          })
                        }
                        icon={<Percent size={16} />}
                      />
                    </div>
                  )}
                </div>

                {/* Pembulatan Nominal Toggle */}
                <div className="p-4 rounded-pos bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">Pembulatan Nominal (Rounding)</span>
                    <span className="text-xs text-slate-400">
                      Otomatis membulatkan total pembayaran ke kelipatan terdekat (misal Rp 100)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transactionConfig.rounding}
                      onChange={(e) =>
                        setTransactionConfig({ ...transactionConfig, rounding: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: STRUK KASIR */}
          {activeTab === 'receipt' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Settings */}
              <Card className="p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Receipt size={20} className="text-brand-primary" />
                    <span>Format & Tampilan Struk Kasir</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sesuaikan informasi yang dicetak pada nota belanja thermal pelanggan
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Teks Header Struk"
                    placeholder="Contoh: TOKO BERKAH SEJAHTERA"
                    value={receiptConfig.header}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, header: e.target.value })}
                  />

                  <Input
                    label="Alamat pada Struk"
                    placeholder="Contoh: Jl. Ahmad Yani No. 45, Makassar"
                    value={receiptConfig.address}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, address: e.target.value })}
                  />

                  <Input
                    label="Teks Footer Struk"
                    placeholder="Contoh: Terima Kasih Telah Berbelanja!"
                    value={receiptConfig.footer}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, footer: e.target.value })}
                  />

                  {/* Ukuran Kertas Thermal Struk */}
                  <Select
                    label="Ukuran Kertas Thermal Default"
                    value={receiptConfig.paper_size || '58mm'}
                    onChange={(e) =>
                      setReceiptConfig({
                        ...receiptConfig,
                        paper_size: e.target.value as '58mm' | '80mm'
                      })
                    }
                    options={[
                      { value: '58mm', label: '58mm - Standar Cashcow / Mini Thermal POS' },
                      { value: '80mm', label: '80mm - Lebar Cashcow POS-80 / Resto Roll' }
                    ]}
                  />

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer py-1.5">
                      <input
                        type="checkbox"
                        checked={receiptConfig.show_cashier}
                        onChange={(e) =>
                          setReceiptConfig({ ...receiptConfig, show_cashier: e.target.checked })
                        }
                        className="w-4 h-4 text-brand-primary rounded-sm focus:ring-brand-secondary"
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        Tampilkan Nama Kasir pada Struk
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer py-1.5">
                      <input
                        type="checkbox"
                        checked={receiptConfig.show_datetime}
                        onChange={(e) =>
                          setReceiptConfig({ ...receiptConfig, show_datetime: e.target.checked })
                        }
                        className="w-4 h-4 text-brand-primary rounded-sm focus:ring-brand-secondary"
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        Tampilkan Tanggal & Waktu pada Struk
                      </span>
                    </label>
                  </div>
                </div>
              </Card>

              {/* Live Receipt Thermal Preview */}
              <Card className="p-6 flex flex-col items-center justify-center bg-slate-50 border-dashed border-2 border-slate-300">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Live Pratinjau Struk (Thermal 58mm / 80mm)
                </span>

                <div className="w-full max-w-[280px] bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-slate-800 font-mono text-[11px] leading-relaxed">
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <p className="font-extrabold text-xs uppercase text-slate-900">
                      {receiptConfig.header || 'TOKO BERKAH SEJAHTERA'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {receiptConfig.address || 'Jl. Ahmad Yani No. 45, Makassar'}
                    </p>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Invoice:</span>
                      <span className="font-bold">INV-SAMPLE-001</span>
                    </div>
                    {receiptConfig.show_datetime && (
                      <div className="flex justify-between">
                        <span>Waktu:</span>
                        <span>05 Sep 2026 12:30 WITA</span>
                      </div>
                    )}
                    {receiptConfig.show_cashier && (
                      <div className="flex justify-between">
                        <span>Kasir:</span>
                        <span>Kasir Utama</span>
                      </div>
                    )}
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 space-y-1">
                    <div>
                      <p className="font-bold">Nasi Goreng Spesial</p>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>2 x Rp18.000</span>
                        <span>Rp36.000</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold">Es Teh Manis</p>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>2 x Rp4.000</span>
                        <span>Rp8.000</span>
                      </div>
                    </div>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rp44.000</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1 text-slate-900">
                      <span>TOTAL:</span>
                      <span>Rp44.000</span>
                    </div>
                  </div>

                  <div className="text-center pt-2 text-[10px] text-slate-500">
                    <p className="font-semibold">{receiptConfig.footer || 'Terima Kasih!'}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: SISTEM */}
          {activeTab === 'system' && (
            <Card className="p-6 space-y-5 max-w-2xl">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Globe size={20} className="text-brand-primary" />
                  <span>Konfigurasi Standar Sistem POS</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nilai bawaan regional yang digunakan pada format waktu, mata uang, dan bahasa
                </p>
              </div>

              <div className="space-y-4">
                {/* Bahasa */}
                <Select
                  label="Bahasa Aplikasi"
                  value={systemConfig.language}
                  onChange={(e) => setSystemConfig({ ...systemConfig, language: e.target.value })}
                  options={[
                    { value: 'id', label: 'Bahasa Indonesia (Default)' },
                    { value: 'en', label: 'English' }
                  ]}
                />

                {/* Mata Uang */}
                <Select
                  label="Mata Uang Transaksi"
                  value={systemConfig.currency}
                  onChange={(e) => setSystemConfig({ ...systemConfig, currency: e.target.value })}
                  options={[
                    { value: 'IDR', label: 'Rupiah Indonesia (Rp / IDR - Default)' }
                  ]}
                />

                {/* Timezone */}
                <Select
                  label="Zona Waktu (Timezone)"
                  value={systemConfig.timezone}
                  onChange={(e) => setSystemConfig({ ...systemConfig, timezone: e.target.value })}
                  options={[
                    { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA - Default)' },
                    { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
                    { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT)' }
                  ]}
                />
              </div>

              <div className="p-4 rounded-pos bg-brand-bg border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-brand-primary flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>Standar Pengaturan Default:</span>
                </p>
                <p>• Bahasa: <strong>Bahasa Indonesia</strong></p>
                <p>• Mata Uang: <strong>Rupiah (IDR)</strong></p>
                <p>• Timezone: <strong>Asia/Makassar (WITA)</strong></p>
              </div>
            </Card>
          )}

          {/* TAB 5: APLIKASI TABLET & PWA */}
          {activeTab === 'tablet' && (
            <div className="space-y-6">
              {/* Hero Status Card */}
              <Card className="p-6 sm:p-8 bg-gradient-to-br from-[#3E2410] to-[#2B1E16] text-white rounded-3xl border border-[#CBC6B2]/30 shadow-xl relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#835227]/40 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#835227] border-2 border-[#CBC6B2]/40 p-2 shrink-0 flex items-center justify-center shadow-lg overflow-hidden">
                      <img src="/app-icon.png" alt="SISISAWA" className="w-full h-full object-cover rounded-2xl" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#CBC6B2] text-[#3E2410]">
                          SISISAWA POS UMKM
                        </span>
                        {isStandalone ? (
                          <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Terpasang di Layar Tablet</span>
                          </span>
                        ) : (
                          <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Sparkles size={12} />
                            <span>Siap Di-install</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Aplikasi Kasir Tablet & iPad
                      </h3>
                      <p className="text-xs sm:text-sm text-[#CBC6B2] max-w-xl leading-relaxed">
                        Pasang aplikasi SISISAWA langsung ke layar utama tablet Anda. Buka kasir dengan 1-klik, layar penuh tanpa bilah browser (fullscreen), dan responsif untuk mode mendatar (landscape).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={handleInstallTablet}
                      icon={isStandalone ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Download size={18} />}
                      className="w-full font-black rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white shadow-lg shadow-[#835227]/30 transition-all cursor-pointer py-3.5"
                    >
                      {isStandalone ? 'Sudah Terpasang (Buka Info)' : 'Install ke Tablet Sekarang'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => navigate('/pos')}
                      icon={<ShoppingCart size={18} />}
                      className="w-full font-bold rounded-2xl bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
                    >
                      Buka Layar Kasir POS
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Panduan 2 Kolom: Android Tablet & Apple iPad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Android Tablet */}
                <Card className="p-6 space-y-4 border-[#CBC6B2]/40 bg-white shadow-xs">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-800">Tablet Android / Chrome</h4>
                      <p className="text-xs text-slate-400">Samsung Galaxy Tab, Xiaomi Pad, Lenovo, HP Android</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-800 block">Klik Tombol Install di Atas</strong>
                        <span>Jika browser Chrome mendukung, pop-up konfirmasi install akan langsung muncul.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-800 block">Atau via Menu Titik Tiga (⋮)</strong>
                        <span>Ketuk ikon titik tiga di sudut kanan atas browser Google Chrome.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <strong className="text-slate-800 block">Pilih "Install Aplikasi"</strong>
                        <span>Atau pilih opsi "Tambahkan ke Layar Utama" (Add to Home Screen).</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 2. Apple iPad / iOS Safari */}
                <Card className="p-6 space-y-4 border-[#CBC6B2]/40 bg-white shadow-xs">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-700 flex items-center justify-center shrink-0">
                      <Tablet size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-800">Apple iPad & iPhone (Safari)</h4>
                      <p className="text-xs text-slate-400">iPad Pro, iPad Air, iPad Mini, iOS Safari</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-800 block">Buka dengan Safari</strong>
                        <span>Pastikan Anda membuka alamat SISISAWA melalui browser bawaan Apple Safari.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-800 flex items-center gap-1.5">
                          Ketuk Tombol Bagikan <Share size={15} className="text-[#835227]" />
                        </strong>
                        <span>Ikon kotak dengan panah mengarah ke atas di bar navigasi Safari.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#835227] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <strong className="text-slate-800 flex items-center gap-1.5">
                          Pilih "Tambah ke Layar Utama" <PlusSquare size={15} className="text-[#835227]" />
                        </strong>
                        <span>Gulir ke bawah dan ketuk opsi tersebut, lalu ketuk "Tambah" di pojok kanan atas.</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Kelebihan Mode Tablet */}
              <Card className="p-6 bg-amber-50/50 border border-amber-200/60 rounded-3xl space-y-3">
                <h4 className="font-black text-sm text-[#3E2410] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-[#835227]" />
                  <span>Keunggulan Menggunakan SISISAWA Mode Tablet:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200/40 space-y-1">
                    <p className="font-extrabold text-slate-900">🖥️ Layar Penuh (Fullscreen)</p>
                    <p className="text-slate-500 leading-relaxed">Bebas dari URL bar, tab, atau bookmark browser. Kasir lebih fokus dan anti-salah klik.</p>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200/40 space-y-1">
                    <p className="font-extrabold text-slate-900">⚡ 1-Sentuhan Langsung Buka</p>
                    <p className="text-slate-500 leading-relaxed">Icon toko Anda terpasang di homescreen tablet layaknya aplikasi native Android/iOS.</p>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200/40 space-y-1">
                    <p className="font-extrabold text-slate-900">🖨️ Cetak Bluetooth Instan</p>
                    <p className="text-slate-500 leading-relaxed">Terhubung cepat ke printer thermal kasir 58mm/80mm untuk mencetak struk nota belanja.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Action Bar (Hanya tampil jika bukan tab Tablet) */}
          {activeTab !== 'tablet' && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="accent"
                size="lg"
                loading={saving}
                icon={<Save size={18} />}
                className="font-bold min-w-[200px]"
              >
                Simpan {getTabLabel(activeTab)}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* Modal Panduan Install Tablet */}
      <Modal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        title="Pasang SISISAWA di Tablet / HP"
        maxWidth="md"
      >
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#3E2410] text-white">
            <div className="w-14 h-14 rounded-2xl bg-[#835227] border border-[#CBC6B2]/40 p-1 shrink-0 flex items-center justify-center overflow-hidden">
              <img src="/app-icon.png" alt="SISISAWA" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-base text-white">SISISAWA Kasir UMKM</h4>
                {isStandalone && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-[#CBC6B2]">Aplikasi POS Layar Sentuh Khusus Tablet & Smartphone</p>
            </div>
          </div>

          {isStandalone ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm space-y-1">
              <p className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Aplikasi Sudah Terpasang!</span>
              </p>
              <p className="text-emerald-700 text-xs leading-relaxed">
                SISISAWA sudah terpasang di perangkat Anda dan berjalan dalam mode aplikasi layar penuh (standalone). Anda dapat membukanya kapan saja langsung dari layar utama tablet Anda.
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <p className="font-bold text-[#835227] flex items-center gap-1.5">
                <Tablet size={16} />
                <span>Cara Pasang di iPad / iOS Safari:</span>
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#835227] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Ketuk tombol <strong className="inline-flex items-center gap-1 text-slate-900 font-extrabold"><Share size={14} className="text-[#835227]" /> Bagikan (Share)</strong> di bilah navigasi Safari.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#835227] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Gulir ke bawah dan ketuk <strong className="inline-flex items-center gap-1 text-slate-900 font-extrabold"><PlusSquare size={14} className="text-[#835227]" /> Tambahkan ke Layar Utama</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#835227] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Ketuk <strong className="text-slate-900 font-extrabold">"Tambah"</strong> di pojok kanan atas. Icon SISISAWA akan terpasang di homescreen.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <p className="font-bold text-[#835227] flex items-center gap-1.5">
                <Smartphone size={16} />
                <span>Cara Pasang di Tablet Android / Chrome:</span>
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#835227] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Ketuk ikon menu titik tiga (<strong className="text-slate-900 font-black">⋮</strong>) di sudut kanan atas browser Chrome.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#835227] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Pilih opsi <strong className="text-slate-900 font-extrabold">"Install aplikasi"</strong> atau <strong className="text-slate-900 font-extrabold">"Tambahkan ke Layar Utama"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#835227] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Konfirmasi dengan mengetuk <strong className="text-slate-900 font-extrabold">"Install"</strong>.</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setIsInstallModalOpen(false);
                navigate('/pos');
              }}
              className="text-xs font-bold text-[#835227] hover:underline cursor-pointer"
            >
              Buka Layar Kasir POS &rarr;
            </button>
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={() => setIsInstallModalOpen(false)}
              className="rounded-xl px-6 font-bold"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
