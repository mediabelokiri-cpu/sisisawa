import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Eye,
  RefreshCw,
  Printer,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import api from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  DashboardSummary,
  ChartDataPoint,
  TopProduct,
  RecentTransaction,
  TransactionDetail
} from '../../types';

export const Dashboard: React.FC = () => {
  const [rangeFilter, setRangeFilter] = useState<'today' | '7d' | '30d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [summary, setSummary] = useState<DashboardSummary>({
    totalSales: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    averageTransaction: 0
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Transaction Detail Modal State
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [txDetail, setTxDetail] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/dashboard/stats?range=${rangeFilter}`;
      if (rangeFilter === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setSummary(res.data.data.summary);
        setChartData(res.data.data.chartData);
        setTopProducts(res.data.data.topProducts);
        setRecentTransactions(res.data.data.recentTransactions);
      }
    } catch (err: any) {
      console.error('Fetch dashboard error:', err);
      setError('Gagal memuat data dashboard. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rangeFilter !== 'custom' || (startDate && endDate)) {
      fetchDashboardData();
    }
  }, [rangeFilter, startDate, endDate]);

  // Open Detail Modal
  const handleViewDetail = async (txId: number) => {
    setSelectedTxId(txId);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/dashboard/transactions/${txId}`);
      if (res.data.success) {
        setTxDetail(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Filter Bar (Warm Chukwudi Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Ringkasan Kinerja Penjualan 📊
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Pilih rentang waktu untuk memantau performa toko secara real-time
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl bg-slate-100/80 p-1.5 border border-slate-200/50">
            <button
              onClick={() => setRangeFilter('today')}
              className={`px-3.5 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rangeFilter === 'today'
                  ? 'bg-[#835227] text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setRangeFilter('7d')}
              className={`px-3.5 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rangeFilter === '7d'
                  ? 'bg-[#835227] text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setRangeFilter('30d')}
              className={`px-3.5 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rangeFilter === '30d'
                  ? 'bg-[#835227] text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setRangeFilter('custom')}
              className={`px-3.5 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rangeFilter === 'custom'
                  ? 'bg-[#835227] text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Data"
            className="rounded-2xl"
          >
            Segarkan
          </Button>
        </div>
      </div>

      {/* Custom Date Inputs if Custom Selected */}
      {rangeFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <Calendar size={18} className="text-[#835227]" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Mulai:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 min-h-[40px] border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Sampai:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 min-h-[40px] border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 font-bold">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 STATISTIC CARDS (Strictly ONLY these 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 1. Total Penjualan */}
        <StatCard
          title="Total Penjualan"
          value={formatIDR(summary.totalSales)}
          subtitle="Nominal seluruh transaksi berhasil"
          icon={<DollarSign size={24} />}
          iconBgColor="bg-[#835227]/10"
          iconColor="text-[#835227]"
        />

        {/* 2. Total Transaksi */}
        <StatCard
          title="Total Transaksi"
          value={`${summary.totalTransactions} Nota`}
          subtitle="Jumlah transaksi kasir berhasil"
          icon={<Receipt size={24} />}
          iconBgColor="bg-[#CBC6B2]/30"
          iconColor="text-[#835227]"
        />

        {/* 3. Total Item Terjual */}
        <StatCard
          title="Total Item Terjual"
          value={`${summary.totalItemsSold} Pcs`}
          subtitle="Jumlah kuantitas item terjual"
          icon={<ShoppingBag size={24} />}
          iconBgColor="bg-[#8B9793]/20"
          iconColor="text-[#8B9793]"
        />

        {/* 4. Rata-rata Transaksi */}
        <StatCard
          title="Rata-rata Transaksi"
          value={formatIDR(summary.averageTransaction)}
          subtitle="Nilai rata-rata per transaksi"
          icon={<TrendingUp size={24} />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      {/* SALES CHART & TOP 5 BEST SELLERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Penjualan (Primary Color: #8B9793 / #835227) */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Grafik Penjualan</h3>
              <p className="text-xs text-slate-400 font-medium">Tren omset penjualan periode terpilih</p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#8B9793]/15 text-[#835227] border border-[#8B9793]/30">
              Tren Omset
            </span>
          </div>

          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm font-medium">
                Belum ada data penjualan pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#835227" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8B9793" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `Rp${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatIDR(Number(val)), 'Total Penjualan']}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#835227"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top 5 Produk Terlaris */}
        <Card className="flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Top 5 Produk Terlaris</h3>
            <p className="text-xs text-slate-400 font-medium">Berdasarkan kuantitas item terjual</p>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto no-scrollbar">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs sm:text-sm">
                Belum ada produk terjual pada periode ini.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-[#CBC6B2]/30 text-[#835227] font-black text-xs flex items-center justify-center shrink-0 border border-[#CBC6B2]/60">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">{p.productName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{p.categoryName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-black text-[#835227] block">
                      {p.totalQty} <span className="text-[11px] font-normal text-slate-400">terjual</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{formatIDR(p.totalRevenue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* TRANSAKSI TERBARU */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Transaksi Terbaru</h3>
            <p className="text-xs text-slate-400 font-medium">Daftar nota transaksi terkini di kasir</p>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-5 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 text-[11px] uppercase font-black tracking-wider">
                <th className="py-3.5 px-4">Invoice</th>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Kasir</th>
                <th className="py-3.5 px-4">Metode Bayar</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#CBC6B2]/15 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(tx.id)}
                  >
                    <td className="py-3.5 px-4 font-black text-[#835227]">
                      {tx.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(tx.created_at || tx.createdAt || '')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {tx.cashier_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatIDR(tx.total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={tx.status === 'Completed' ? 'success' : 'danger'}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewDetail(tx.id)}
                        className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-[#835227] hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>


      {/* DETAIL TRANSAKSI MODAL */}
      <Modal
        isOpen={selectedTxId !== null}
        onClose={() => {
          setSelectedTxId(null);
          setTxDetail(null);
        }}
        title="Detail Transaksi & Struk"
        maxWidth="lg"
      >
        {loadingDetail || !txDetail ? (
          <LoadingSpinner size="md" label="Memuat rincian transaksi..." />
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Nomor Invoice</span>
                <h4 className="text-lg font-bold text-brand-primary">{txDetail.transaction.invoice_number}</h4>
              </div>
              <Badge variant={txDetail.transaction.status === 'Completed' ? 'success' : 'danger'}>
                {txDetail.transaction.status}
              </Badge>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3.5 rounded-pos">
              <div>
                <span className="text-xs text-slate-400 block">Waktu Transaksi</span>
                <span className="font-semibold text-slate-700">{formatDate(txDetail.transaction.created_at || txDetail.transaction.createdAt || '')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Kasir Bertugas</span>
                <span className="font-semibold text-slate-700">{txDetail.transaction.cashier_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Metode Pembayaran</span>
                <span className="font-semibold text-slate-700">{txDetail.transaction.payment_method}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Status Pembayaran</span>
                <span className="font-semibold text-emerald-600">Lunas</span>
              </div>
            </div>

            {/* Item list */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Pembelian</h5>
              <div className="border border-slate-200 rounded-pos divide-y divide-slate-100 overflow-hidden">
                {txDetail.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{item.product_name}</p>
                      <p className="text-xs text-slate-400">
                        {item.quantity} x {formatIDR(item.price)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800">{formatIDR(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 pt-2 text-sm border-t border-slate-200">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatIDR(txDetail.transaction.subtotal)}</span>
              </div>
              {Number(txDetail.transaction.discount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span>-{formatIDR(txDetail.transaction.discount)}</span>
                </div>
              )}
              {Number(txDetail.transaction.tax) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Pajak (Tax)</span>
                  <span>+{formatIDR(txDetail.transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-dashed border-slate-200">
                <span>Total Pembayaran</span>
                <span className="text-brand-primary text-lg">{formatIDR(txDetail.transaction.total)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTxId(null);
                  setTxDetail(null);
                }}
              >
                Tutup
              </Button>
              <Button
                variant="secondary"
                icon={<Printer size={18} />}
                onClick={() => window.print()}
              >
                Cetak Struk
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
