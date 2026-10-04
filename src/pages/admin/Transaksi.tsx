import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Eye,
  Printer,
  Ban,
  RefreshCw,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Trash2
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
import { ReceiptPreview } from '../../components/ui/ReceiptPreview';
import {
  RecentTransaction,
  TransactionDetail,
  PaymentMethod
} from '../../types';

interface CashierUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

export const Transaksi: React.FC = () => {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Multi-Filter State
  const [searchInvoice, setSearchInvoice] = useState<string>('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Detail Modal State
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [txDetail, setTxDetail] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Print Modal State
  const [printTxDetail, setPrintTxDetail] = useState<TransactionDetail | null>(null);

  // Cancel Confirmation State
  const [cancellingTx, setCancellingTx] = useState<RecentTransaction | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Delete Single Transaction State
  const [deletingTx, setDeletingTx] = useState<RecentTransaction | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState<boolean>(false);

  // Clear All Transactions State
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  const fetchCashiers = async () => {
    try {
      const res = await api.get('/transactions/cashiers');
      if (res.data.success) {
        setCashiers(res.data.data);
      }
    } catch (err) {
      console.error('Fetch cashiers error:', err);
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError('');

      let url = `/transactions?page=${page}&limit=20`;

      if (searchInvoice.trim()) {
        url += `&search=${encodeURIComponent(searchInvoice.trim())}`;
      }
      if (selectedCashier !== 'all') {
        url += `&cashierId=${selectedCashier}`;
      }
      if (selectedPayment !== 'all') {
        url += `&paymentMethod=${selectedPayment}`;
      }
      if (selectedStatus !== 'ALL') {
        url += `&status=${selectedStatus}`;
      }

      // Calculate Dates based on preset
      const now = new Date();
      if (dateRangePreset === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        url += `&startDate=${todayStart.toISOString()}`;
      } else if (dateRangePreset === '7d') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        url += `&startDate=${past7.toISOString()}`;
      } else if (dateRangePreset === '30d') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        url += `&startDate=${past30.toISOString()}`;
      } else if (dateRangePreset === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setTransactions(res.data.data.transactions);
        setCurrentPage(res.data.data.pagination.page);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Fetch transactions error:', err);
      setError('Gagal memuat riwayat transaksi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInvoice, selectedCashier, selectedPayment, selectedStatus, dateRangePreset, startDate, endDate]);

  const handleOpenDetail = async (txId: number) => {
    setSelectedTxId(txId);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/transactions/${txId}`);
      if (res.data.success) {
        setTxDetail(res.data.data);
      }
    } catch (err) {
      console.error('Fetch detail error:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenPrint = async (txId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.get(`/transactions/${txId}`);
      if (res.data.success) {
        setPrintTxDetail(res.data.data);
      }
    } catch (err) {
      console.error('Fetch detail for print error:', err);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingTx) return;
    try {
      setIsCancelling(true);
      const res = await api.patch(`/transactions/${cancellingTx.id}/cancel`);
      if (res.data.success) {
        const inv = cancellingTx.invoiceNumber || cancellingTx.invoice_number;
        showNotification(`Transaksi ${inv} berhasil dibatalkan (Cancelled).`);
        setCancellingTx(null);
        if (selectedTxId === cancellingTx.id) {
          handleOpenDetail(cancellingTx.id);
        }
        fetchTransactions(currentPage);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Gagal membatalkan transaksi.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingTx) return;
    try {
      setIsDeletingSingle(true);
      const res = await api.delete(`/transactions/${deletingTx.id}`);
      if (res.data.success) {
        const inv = deletingTx.invoiceNumber || deletingTx.invoice_number;
        showNotification(`Transaksi ${inv} berhasil dihapus permanen.`);
        setDeletingTx(null);
        if (selectedTxId === deletingTx.id) {
          setSelectedTxId(null);
          setTxDetail(null);
        }
        fetchTransactions(currentPage);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Gagal menghapus transaksi.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      setIsClearingAll(true);
      const res = await api.delete('/transactions/clear-all');
      if (res.data.success) {
        showNotification('Seluruh riwayat transaksi berhasil dibersihkan.');
        setShowClearAllModal(false);
        setSelectedTxId(null);
        setTxDetail(null);
        fetchTransactions(1);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Gagal membersihkan transaksi.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
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

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'Cash':
        return <Banknote size={15} className="text-emerald-600" />;
      case 'QRIS':
        return <QrCode size={15} className="text-brand-primary" />;
      case 'Debit':
        return <CreditCard size={15} className="text-sky-600" />;
      case 'Transfer':
        return <ArrowRightLeft size={15} className="text-purple-600" />;
      default:
        return <Banknote size={15} />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#CBC6B2]/40 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#835227]/10 flex items-center justify-center text-[#835227]">
              <Receipt size={20} />
            </div>
            <span>Riwayat Seluruh Transaksi 🧾</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Kelola, telusuri nota penjualan, cetak ulang struk, atau hapus riwayat transaksi
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowClearAllModal(true)}
              icon={<Trash2 size={16} className="text-rose-600" />}
              className="rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
            >
              Bersihkan Semua
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onClick={() => fetchTransactions(currentPage)}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Transaksi"
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

      {/* Multi-Criteria Filter Bar */}
      <Card className="p-5 space-y-4 rounded-3xl">
        {/* Row 1: Search, Cashier, Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Invoice / Cashier */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Cari nomor invoice (contoh: INV-2026...)"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          {/* Kasir Filter */}
          <div>
            <Select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Kasir' },
                ...cashiers.map((c) => ({ value: String(c.id), label: `${c.name} (${c.role})` }))
              ]}
            />
          </div>

          {/* Payment Method Filter */}
          <div>
            <Select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Metode Bayar' },
                { value: 'Cash', label: 'Cash (Tunai)' },
                { value: 'QRIS', label: 'QRIS' },
                { value: 'Debit', label: 'Kartu Debit' },
                { value: 'Transfer', label: 'Transfer Bank' }
              ]}
            />
          </div>
        </div>


        {/* Row 2: Date Range Presets & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Date Presets */}
          <div className="inline-flex rounded-pos bg-slate-100 p-1 border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setDateRangePreset('all')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateRangePreset === 'all'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setDateRangePreset('today')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateRangePreset === 'today'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateRangePreset('7d')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateRangePreset === '7d'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => setDateRangePreset('30d')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateRangePreset === '30d'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari Terakhir
            </button>
            <button
              onClick={() => setDateRangePreset('custom')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateRangePreset === 'custom'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kustom Tanggal
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="inline-flex rounded-pos bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === 'ALL'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setSelectedStatus('Completed')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === 'Completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setSelectedStatus('Cancelled')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === 'Cancelled'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateRangePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <Calendar size={18} className="text-brand-secondary" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Dari Tanggal:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 min-h-[40px] border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Sampai Tanggal:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 min-h-[40px] border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Table */}
      {loading && transactions.length === 0 ? (
        <LoadingSpinner size="lg" label="Memuat riwayat transaksi..." />
      ) : transactions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Receipt size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">
            Tidak Ada Transaksi Ditemukan
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Coba sesuaikan kata kunci pencarian, filter tanggal, atau filter kasir Anda.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">Invoice</th>
                  <th className="py-3.5 px-4">Tanggal / Waktu</th>
                  <th className="py-3.5 px-4">Kasir</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Total Pembayaran</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((tx: any) => {
                  const inv = tx.invoiceNumber || tx.invoice_number;
                  const dt = tx.createdAt || tx.created_at;
                  const cName = tx.cashierName || tx.cashier_name;
                  const pMethod = tx.paymentMethod || tx.payment_method;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => handleOpenDetail(tx.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-bold text-brand-primary">
                        {inv}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDateTime(dt)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {cName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          {getPaymentIcon(pMethod)}
                          <span>{pMethod}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatIDR(tx.total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={tx.status === 'Completed' ? 'success' : 'danger'}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Lihat Detail */}
                          <button
                            onClick={() => handleOpenDetail(tx.id)}
                            className="p-2 min-h-[38px] min-w-[38px] rounded-lg text-slate-500 hover:text-brand-primary hover:bg-slate-100"
                            title="Lihat Rincian Transaksi"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Cetak Ulang Struk */}
                          <button
                            onClick={(e) => handleOpenPrint(tx.id, e)}
                            className="p-2 min-h-[38px] min-w-[38px] rounded-lg text-slate-500 hover:text-brand-secondary hover:bg-sky-50"
                            title="Cetak Ulang Struk"
                          >
                            <Printer size={16} />
                          </button>

                          {/* Batalkan Transaksi (Hanya jika belum Cancelled) */}
                          {tx.status === 'Completed' && (
                            <button
                              onClick={() => setCancellingTx(tx)}
                              className="p-2 min-h-[38px] min-w-[38px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Batalkan Transaksi"
                            >
                              <Ban size={16} />
                            </button>
                          )}

                          {/* Hapus Transaksi Permanen */}
                          <button
                            onClick={() => setDeletingTx(tx)}
                            className="p-2 min-h-[38px] min-w-[38px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Transaksi Permanen"
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
              <span>
                Menampilkan halaman {currentPage} dari {totalPages} ({totalCount} transaksi)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchTransactions(currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchTransactions(currentPage + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* DETAIL TRANSAKSI MODAL */}
      <Modal
        isOpen={selectedTxId !== null}
        onClose={() => {
          setSelectedTxId(null);
          setTxDetail(null);
        }}
        title="Detail Nota Transaksi"
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
                <h4 className="text-lg font-bold text-brand-primary">
                  {txDetail.transaction.invoiceNumber || txDetail.transaction.invoice_number}
                </h4>
              </div>
              <Badge variant={txDetail.transaction.status === 'Completed' ? 'success' : 'danger'}>
                {txDetail.transaction.status}
              </Badge>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3.5 rounded-pos border border-slate-200/80">
              <div>
                <span className="text-xs text-slate-400 block">Waktu Transaksi</span>
                <span className="font-semibold text-slate-700">
                  {formatDateTime(txDetail.transaction.createdAt || txDetail.transaction.created_at || '')} WITA
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Kasir Bertugas</span>
                <span className="font-semibold text-slate-700">
                  {txDetail.transaction.cashierName || txDetail.transaction.cashier_name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Metode Pembayaran</span>
                <span className="font-semibold text-slate-700">
                  {txDetail.transaction.paymentMethod || txDetail.transaction.payment_method}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Status Pembayaran</span>
                <span className={`font-semibold ${txDetail.transaction.status === 'Completed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {txDetail.transaction.status === 'Completed' ? 'Lunas (Completed)' : 'Dibatalkan (Cancelled)'}
                </span>
              </div>
            </div>

            {/* Item list */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Pembelian</h5>
              <div className="border border-slate-200 rounded-pos divide-y divide-slate-100 overflow-hidden">
                {txDetail.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{item.productName || item.product_name}</p>
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {txDetail.transaction.status === 'Completed' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Ban size={16} />}
                    onClick={() => {
                      const txToCancel = {
                        id: txDetail.transaction.id,
                        invoiceNumber: txDetail.transaction.invoiceNumber || txDetail.transaction.invoice_number,
                        createdAt: txDetail.transaction.createdAt || txDetail.transaction.created_at,
                        cashierName: txDetail.transaction.cashierName || txDetail.transaction.cashier_name,
                        paymentMethod: txDetail.transaction.paymentMethod || txDetail.transaction.payment_method,
                        total: txDetail.transaction.total,
                        status: txDetail.transaction.status
                      };
                      setCancellingTx(txToCancel);
                    }}
                    className="text-amber-700 hover:bg-amber-50"
                  >
                    Batalkan
                  </Button>
                ) : (
                  <span className="text-xs text-rose-600 font-semibold italic">Dibatalkan</span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 size={16} className="text-rose-600" />}
                  onClick={() => {
                    const txToDelete = {
                      id: txDetail.transaction.id,
                      invoiceNumber: txDetail.transaction.invoiceNumber || txDetail.transaction.invoice_number,
                      createdAt: txDetail.transaction.createdAt || txDetail.transaction.created_at,
                      cashierName: txDetail.transaction.cashierName || txDetail.transaction.cashier_name,
                      paymentMethod: txDetail.transaction.paymentMethod || txDetail.transaction.payment_method,
                      total: txDetail.transaction.total,
                      status: txDetail.transaction.status
                    };
                    setDeletingTx(txToDelete);
                  }}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  Hapus
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTxId(null);
                    setTxDetail(null);
                  }}
                >
                  Tutup
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Printer size={18} />}
                  onClick={() => {
                    const detail = txDetail;
                    setSelectedTxId(null);
                    setTxDetail(null);
                    setPrintTxDetail(detail);
                  }}
                >
                  Cetak Struk
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CETAK STRUK MODAL (Thermal Receipt Format) */}
      {printTxDetail && (
        <Modal
          isOpen={printTxDetail !== null}
          onClose={() => setPrintTxDetail(null)}
          title="Pratinjau Struk Kasir"
          maxWidth="md"
        >
          <ReceiptPreview
            detail={printTxDetail}
            onClose={() => setPrintTxDetail(null)}
          />
        </Modal>
      )}

      {/* CONFIRM DIALOG BATALKAN TRANSAKSI */}
      {cancellingTx && (
        <ConfirmDialog
          isOpen={cancellingTx !== null}
          onClose={() => setCancellingTx(null)}
          onConfirm={handleConfirmCancel}
          title="Batalkan Transaksi"
          message={
            <div>
              Apakah Anda yakin ingin membatalkan transaksi nomor <strong>"{cancellingTx.invoiceNumber || cancellingTx.invoice_number}"</strong> senilai <strong>{formatIDR(cancellingTx.total)}</strong>?
              <p className="mt-2 text-rose-600 text-xs font-medium">
                Catatan: Transaksi yang dibatalkan akan ditandai dengan status Cancelled demi menjaga integritas pembukuan.
              </p>
            </div>
          }
          confirmText="Ya, Batalkan Transaksi"
          variant="danger"
          loading={isCancelling}
        />
      )}

      {/* CONFIRM DIALOG HAPUS TRANSAKSI TUNGGAL */}
      {deletingTx && (
        <ConfirmDialog
          isOpen={deletingTx !== null}
          onClose={() => setDeletingTx(null)}
          onConfirm={handleConfirmDeleteSingle}
          title="Hapus Transaksi Permanen"
          message={
            <div>
              Apakah Anda yakin ingin <strong>menghapus permanen</strong> transaksi nomor <strong>"{deletingTx.invoiceNumber || deletingTx.invoice_number}"</strong> senilai <strong>{formatIDR(deletingTx.total)}</strong>?
              <p className="mt-2 text-rose-600 text-xs font-bold">
                ⚠️ Peringatan: Data transaksi dan item di dalamnya akan dihapus dari database dan tidak dapat dikembalikan.
              </p>
            </div>
          }
          confirmText="Ya, Hapus Permanen"
          variant="danger"
          loading={isDeletingSingle}
        />
      )}

      {/* CONFIRM DIALOG BERSIHKAN SEMUA TRANSAKSI */}
      {showClearAllModal && (
        <ConfirmDialog
          isOpen={showClearAllModal}
          onClose={() => setShowClearAllModal(false)}
          onConfirm={handleConfirmClearAll}
          title="Bersihkan Semua Riwayat Transaksi"
          message={
            <div>
              Apakah Anda yakin ingin <strong>menghapus dan membersihkan SELURUH riwayat transaksi ({totalCount} transaksi)</strong>?
              <p className="mt-2 text-rose-600 text-xs font-bold">
                ⚠️ PERHATIAN: Tindakan ini akan mengosongkan seluruh data transaksi dan laporan penjualan dari database secara permanen.
              </p>
            </div>
          }
          confirmText="Ya, Bersihkan Semua Transaksi"
          variant="danger"
          loading={isClearingAll}
        />
      )}
    </div>
  );
};
