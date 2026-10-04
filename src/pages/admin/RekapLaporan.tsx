import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  Receipt,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Printer,
  RefreshCw,
  AlertCircle,
  Package
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
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface MonthlyReportData {
  period: {
    year: number;
    month: number;
    monthName: string;
    previousMonthName: string;
  };
  summary: {
    totalSales: number;
    totalTransactions: number;
    totalItemsSold: number;
    averageTransaction: number;
    comparison: {
      salesGrowth: number | null;
      transactionsGrowth: number | null;
      itemsGrowth: number | null;
      avgGrowth: number | null;
      prevTotalSales: number;
      prevTotalTransactions: number;
      prevTotalItemsSold: number;
      prevAverageTransaction: number;
    };
  };
  dailyChart: Array<{
    day: number;
    date: string;
    label: string;
    total: number;
    count: number;
  }>;
  topProducts: Array<{
    productName: string;
    categoryName: string;
    totalQty: number;
    totalRevenue: number;
  }>;
  storeProfile: {
    name: string;
    address: string;
    phone: string;
  } | null;
}

export const RekapLaporan: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12

  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const monthsList = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const yearsList = [
    { value: String(currentDate.getFullYear() - 1), label: String(currentDate.getFullYear() - 1) },
    { value: String(currentDate.getFullYear()), label: String(currentDate.getFullYear()) },
    { value: String(currentDate.getFullYear() + 1), label: String(currentDate.getFullYear() + 1) }
  ];

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch monthly report error:', err);
      setError('Gagal memuat rekap laporan bulanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const renderGrowthBadge = (growth: number | null, prevLabel: string) => {
    if (growth === null || isNaN(growth)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
          <Minus size={13} />
          <span>Stabil vs {prevLabel}</span>
        </span>
      );
    }

    if (growth > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <TrendingUp size={13} />
          <span>+{growth}% vs {prevLabel}</span>
        </span>
      );
    }

    if (growth < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          <TrendingDown size={13} />
          <span>{growth}% vs {prevLabel}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
        <Minus size={13} />
        <span>0% vs {prevLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header & Month/Year Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="text-[#835227]" size={22} />
            <span>Rekap Laporan Bulanan 📈</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Analisis tren kinerja penjualan, perbandingan pertumbuhan, dan produk favorit
          </p>
        </div>

        {/* Date Selector and Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month & Year Stepper */}
          <div className="inline-flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-200 transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Select
                value={String(selectedMonth)}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                options={monthsList}
                className="min-h-[36px] py-1 text-xs font-black border-none bg-transparent shadow-none cursor-pointer"
              />
              <Select
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                options={yearsList}
                className="min-h-[36px] py-1 text-xs font-black border-none bg-transparent shadow-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextMonth}
              className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-200 transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={fetchMonthlyReport}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Laporan"
            className="rounded-2xl"
          >
            Segarkan
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={<Printer size={18} />}
            onClick={() => window.print()}
            className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white"
          >
            Cetak Laporan
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs font-bold">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Printable Report Document Header (visible only when printing or at the top) */}
      <div className="hidden print:block text-center pb-4 border-b border-slate-300">
        <h1 className="text-xl font-extrabold uppercase text-slate-900">
          {reportData?.storeProfile?.name || 'KASIRKU POS UMKM'}
        </h1>
        <p className="text-sm text-slate-600">
          LAPORAN REKAP PERFORMA PENJUALAN BULAN {reportData?.period.monthName.toUpperCase()} {reportData?.period.year}
        </p>
      </div>

      {loading && !reportData ? (
        <LoadingSpinner size="lg" label="Menyusun rekap laporan bulanan..." />
      ) : reportData ? (
        <>
          {/* 4 COMPARATIVE STATISTIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Total Penjualan */}
            <Card className="p-5 sm:p-6 flex flex-col justify-between border-slate-100 hover:border-[#835227]/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Total Penjualan
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    {formatIDR(reportData.summary.totalSales)}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#835227]/10 text-[#835227] flex items-center justify-center shrink-0">
                  <DollarSign size={24} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {renderGrowthBadge(
                  reportData.summary.comparison.salesGrowth,
                  reportData.period.previousMonthName
                )}
                <span className="text-[11px] font-medium text-slate-400">
                  Lalu: {formatIDR(reportData.summary.comparison.prevTotalSales)}
                </span>
              </div>
            </Card>

            {/* 2. Total Transaksi */}
            <Card className="p-5 sm:p-6 flex flex-col justify-between border-slate-100 hover:border-[#835227]/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Total Transaksi
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    {reportData.summary.totalTransactions} <span className="text-sm font-semibold text-slate-400">Nota</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#CBC6B2]/30 text-[#835227] flex items-center justify-center shrink-0">
                  <Receipt size={24} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {renderGrowthBadge(
                  reportData.summary.comparison.transactionsGrowth,
                  reportData.period.previousMonthName
                )}
                <span className="text-[11px] font-medium text-slate-400">
                  Lalu: {reportData.summary.comparison.prevTotalTransactions}
                </span>
              </div>
            </Card>

            {/* 3. Total Item Terjual */}
            <Card className="p-5 sm:p-6 flex flex-col justify-between border-slate-100 hover:border-[#835227]/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Total Item Terjual
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    {reportData.summary.totalItemsSold} <span className="text-sm font-semibold text-slate-400">Pcs</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#8B9793]/20 text-[#8B9793] flex items-center justify-center shrink-0">
                  <ShoppingBag size={24} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {renderGrowthBadge(
                  reportData.summary.comparison.itemsGrowth,
                  reportData.period.previousMonthName
                )}
                <span className="text-[11px] font-medium text-slate-400">
                  Lalu: {reportData.summary.comparison.prevTotalItemsSold}
                </span>
              </div>
            </Card>

            {/* 4. Rata-rata Transaksi */}
            <Card className="p-5 flex flex-col justify-between border-slate-200 hover:shadow-subtle-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Rata-rata Transaksi
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    {formatIDR(reportData.summary.averageTransaction)}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp size={24} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {renderGrowthBadge(
                  reportData.summary.comparison.avgGrowth,
                  reportData.period.previousMonthName
                )}
                <span className="text-[11px] text-slate-400">
                  Lalu: {formatIDR(reportData.summary.comparison.prevAverageTransaction)}
                </span>
              </div>
            </Card>
          </div>

          {/* DAILY SALES CHART IN THE SELECTED MONTH */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Grafik Penjualan Harian ({reportData.period.monthName} {reportData.period.year})
                </h3>
                <p className="text-xs text-slate-400">
                  Tren pendapatan transaksi harian sepanjang bulan {reportData.period.monthName}
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#8B9793]/15 text-[#835227] border border-[#8B9793]/30">
                Tren Harian
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={reportData.dailyChart}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="monthSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#835227" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B9793" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="day"
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `Tgl ${val}`}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `Rp${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatIDR(Number(val)), 'Total Penjualan']}
                    labelFormatter={(label) => `Tanggal: ${label} ${reportData.period.monthName} ${reportData.period.year}`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#835227"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#monthSalesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* TOP 5 PRODUK TERLARIS BULAN INI */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Package size={20} className="text-brand-secondary" />
                  <span>Produk Terlaris Bulan {reportData.period.monthName}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar 5 produk dengan jumlah kuantitas terjual terbanyak pada bulan terpilih
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs uppercase font-semibold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">Item Terjual</th>
                    <th className="py-3 px-4 text-right">Total Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {reportData.topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada data produk terjual pada bulan {reportData.period.monthName} {reportData.period.year}.
                      </td>
                    </tr>
                  ) : (
                    reportData.topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.productName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {p.categoryName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-extrabold">
                            {p.totalQty} Pcs
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-brand-primary">
                          {formatIDR(p.totalRevenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
};
