import React, { useState } from 'react';
import { Store, Printer, Bluetooth, Share2, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { TransactionDetail } from '../../types';
import {
  PaperSize,
  formatReceiptMoney,
  formatReceiptDate,
  printViaWebBluetooth,
  printViaRawBT
} from '../../utils/thermalPrinter';

interface ReceiptPreviewProps {
  detail: TransactionDetail;
  onClose?: () => void;
  showActions?: boolean;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  detail,
  onClose,
  showActions = true
}) => {
  const { transaction, items, storeProfile, receiptConfig } = detail;

  // Paper size preference (default 58mm for Cashcow POS-58 or 80mm)
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    return (localStorage.getItem('receipt_paper_size') as PaperSize) || '58mm';
  });

  const [btStatus, setBtStatus] = useState<string>('');
  const [btLoading, setBtLoading] = useState<boolean>(false);

  const handlePaperSizeChange = (size: PaperSize) => {
    setPaperSize(size);
    localStorage.setItem('receipt_paper_size', size);
  };

  const invoiceNumber = transaction.invoiceNumber || transaction.invoice_number || '-';
  const createdAt = transaction.createdAt || transaction.created_at || new Date().toISOString();
  const cashierName = transaction.cashierName || transaction.cashier_name || '-';
  const paymentMethod = transaction.paymentMethod || transaction.payment_method || '-';

  const handlePrintBrowser = () => {
    window.print();
  };

  const handlePrintBluetooth = async () => {
    setBtLoading(true);
    setBtStatus('Menghubungkan ke printer Cashcow...');
    const result = await printViaWebBluetooth(detail, paperSize);
    setBtStatus(result.message);
    setBtLoading(false);
    setTimeout(() => setBtStatus(''), 6000);
  };

  const handlePrintRawBT = () => {
    printViaRawBT(detail, paperSize);
  };

  const is58 = paperSize === '58mm';

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {/* Paper Size Switcher (58mm vs 80mm) */}
      <div className="flex items-center justify-between gap-3 w-full max-w-[360px] px-2 print:hidden">
        <span className="text-xs font-bold text-slate-700">Ukuran Kertas Thermal:</span>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => handlePaperSizeChange('58mm')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              paperSize === '58mm'
                ? 'bg-[#835227] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            58mm (Standar)
          </button>
          <button
            type="button"
            onClick={() => handlePaperSizeChange('80mm')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              paperSize === '80mm'
                ? 'bg-[#835227] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            80mm (Lebar)
          </button>
        </div>
      </div>

      {/* Bluetooth Notification Banner */}
      {btStatus && (
        <div className="w-full max-w-[360px] p-3 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-2 shadow-md animate-in fade-in print:hidden">
          {btStatus.includes('berhasil') ? (
            <Check size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
          )}
          <span className="flex-1">{btStatus}</span>
        </div>
      )}

      {/* Thermal Receipt Body (Optimized for 48mm/72mm Thermal Heads with Authentic POS Monospace) */}
      <div
        id="printable-receipt"
        className={`w-full bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-sm text-black leading-tight print:w-full print:max-w-none print:border-none print:shadow-none print:p-0 ${
          is58 ? 'max-w-[290px] text-[10.5px]' : 'max-w-[380px] text-[12px]'
        }`}
        style={{
          fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, Consolas, monospace",
          fontWeight: 600
        }}
      >
        {/* Store Header */}
        <div className="text-center pb-2.5 border-b border-dashed border-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Store size={16} className="text-slate-700 print:hidden" />
            <h2 className="font-extrabold text-sm uppercase tracking-wide text-black">
              {receiptConfig?.header || storeProfile?.name || 'SISISAWA KASIR'}
            </h2>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-700">
            {receiptConfig?.address || storeProfile?.address || 'Jl. Pusat Kuliner & Usaha No. 01'}
          </p>
          {(storeProfile?.phone || storeProfile?.whatsapp) && (
            <p className="text-[10px] sm:text-[11px] text-slate-600">
              Telp: {storeProfile?.phone || storeProfile?.whatsapp}
            </p>
          )}
        </div>

        {/* Transaction Metadata */}
        <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px] sm:text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-600">No. Nota:</span>
            <span className="font-bold text-black pr-1">{invoiceNumber}</span>
          </div>

          {(receiptConfig?.show_datetime ?? true) && (
            <div className="flex justify-between">
              <span className="text-slate-600">Waktu:</span>
              <span className="pr-1">{formatReceiptDate(createdAt)} WITA</span>
            </div>
          )}

          {(receiptConfig?.show_cashier ?? true) && (
            <div className="flex justify-between">
              <span className="text-slate-600">Kasir:</span>
              <span className="font-bold pr-1">{cashierName}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-600">Pembayaran:</span>
            <span className="font-bold pr-1">{paymentMethod}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-600">Status:</span>
            <span className="font-extrabold text-black pr-1">
              {transaction.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <p className="font-bold text-black leading-snug">{item.productName || item.product_name}</p>
              <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-700">
                <span>
                  {item.quantity} x {formatReceiptMoney(Number(item.price))}
                </span>
                <span className="font-extrabold text-black pr-1">{formatReceiptMoney(Number(item.subtotal))}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px] sm:text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-700">Subtotal:</span>
            <span className="pr-1 font-bold">Rp {formatReceiptMoney(Number(transaction.subtotal))}</span>
          </div>

          {Number(transaction.discount) > 0 && (
            <div className="flex justify-between font-bold">
              <span>Diskon:</span>
              <span className="pr-1">-Rp {formatReceiptMoney(Number(transaction.discount))}</span>
            </div>
          )}

          {Number(transaction.tax) > 0 && (
            <div className="flex justify-between">
              <span>Pajak (Tax):</span>
              <span className="pr-1">+Rp {formatReceiptMoney(Number(transaction.tax))}</span>
            </div>
          )}

          <div className="flex justify-between text-xs sm:text-sm font-black pt-1.5 border-t border-slate-900 text-black">
            <span>TOTAL:</span>
            <span className="pr-1">Rp {formatReceiptMoney(Number(transaction.total))}</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-2.5 space-y-1 text-[10px] text-slate-700">
          <p className="font-bold text-black">
            {receiptConfig?.footer || 'Terima Kasih Telah Berbelanja!'}
          </p>
          <p className="text-[9px] text-slate-500">
            Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.
          </p>
        </div>

        {/* Thermal Paper Feed Padding (Prevents Cutter slicing into the footer) */}
        <div className="h-6 print:h-3" />
      </div>

      {/* Action Buttons: 3 Print Methods (Hidden when printing) */}
      {showActions && (
        <div className="flex flex-col gap-2 w-full max-w-[360px] pt-1 print:hidden">
          {/* Main Print Button (Browser / AirPrint / Android Print Service) */}
          <Button
            variant="accent"
            size="md"
            icon={<Printer size={18} />}
            onClick={handlePrintBrowser}
            className="w-full font-black rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white shadow-md shadow-[#835227]/20 cursor-pointer"
          >
            Cetak Struk (System Print / {paperSize})
          </Button>

          {/* Direct Bluetooth to Cashcow (Android / Chrome) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrintBluetooth}
              disabled={btLoading}
              className="py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Cetak langsung via Bluetooth ESC/POS ke Cashcow"
            >
              <Bluetooth size={15} className="text-blue-400" />
              <span>{btLoading ? 'Mengirim...' : 'Bluetooth Cashcow'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintRawBT}
              className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-slate-200"
              title="Kirim ke aplikasi RawBT Printer Android"
            >
              <Share2 size={15} className="text-[#835227]" />
              <span>App RawBT</span>
            </button>
          </div>

          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-2xl mt-1"
            >
              Tutup
            </Button>
          )}
        </div>
      )}

      {/* Print Specific CSS to isolate printable thermal area (Strict Single-Page 48mm/72mm Calibrated) */}
      <style>{`
        @media print {
          @page {
            size: ${is58 ? '58mm auto' : '80mm auto'};
            margin: 0mm !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${is58 ? '48mm' : '72mm'} !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${is58 ? '48mm' : '72mm'} !important;
            max-width: ${is58 ? '48mm' : '72mm'} !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: ${is58 ? '1mm 1mm 4mm 1mm' : '2mm 2mm 6mm 2mm'} !important;
            border: none !important;
            box-shadow: none !important;
            color: #000000 !important;
            background: #ffffff !important;
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, Consolas, monospace !important;
            font-size: ${is58 ? '9.5px' : '11.5px'} !important;
            font-weight: 600 !important;
            line-height: 1.25 !important;
            letter-spacing: -0.2px !important;
            word-break: break-word !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
