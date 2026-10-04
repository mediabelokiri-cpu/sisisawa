import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const Pengaturan: React.FC = () => {
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'transaction' | 'receipt' | 'system'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

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
  }, []);

  const handleSaveCurrentSection = async (e: React.FormEvent) => {
    e.preventDefault();
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

        <div className="flex items-center gap-3">
          <Button
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

          {/* Action Bar */}
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
        </form>
      )}
    </div>
  );
};
