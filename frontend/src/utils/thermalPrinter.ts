import { TransactionDetail } from '../types';

export type PaperSize = '58mm' | '80mm';

// Helper to format currency for thermal receipts (e.g. "Rp 15.000" or "15.000")
export function formatReceiptMoney(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(val);
}

// Helper to format date & time in WITA/Local
export function formatReceiptDate(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch {
    return dateStr || '';
  }
}

/**
 * Format two columns with space filling:
 * e.g., Left: "Kopi Susu x2", Right: "24.000", maxLen: 32 -> "Kopi Susu x2              24.000"
 */
export function formatTwoColumns(left: string, right: string, maxChars: number): string {
  const leftClean = left.trim();
  const rightClean = right.trim();
  const availableSpace = maxChars - rightClean.length;

  if (availableSpace <= 0) {
    return leftClean.substring(0, maxChars);
  }

  if (leftClean.length >= availableSpace) {
    const truncatedLeft = leftClean.substring(0, availableSpace - 1);
    return truncatedLeft + ' ' + rightClean;
  }

  const spacesCount = maxChars - leftClean.length - rightClean.length;
  const spaces = ' '.repeat(Math.max(1, spacesCount));
  return leftClean + spaces + rightClean;
}

/**
 * Format three columns (e.g. Item Name on line 1, "2 x 12.000" left, "24.000" right on line 2)
 */
export function formatItemRow(name: string, qty: number, price: number, subtotal: number, maxChars: number): string[] {
  const lines: string[] = [];
  lines.push(name.trim());
  const qtyPrice = `${qty} x ${formatReceiptMoney(price)}`;
  const subtotalStr = formatReceiptMoney(subtotal);
  lines.push(formatTwoColumns(`  ${qtyPrice}`, subtotalStr, maxChars));
  return lines;
}

/**
 * Generate ESC/POS Byte Buffer for thermal printer (Cashcow, Epson, Xprinter, etc.)
 */
export function buildEscPosBuffer(detail: TransactionDetail, paperSize: PaperSize = '58mm'): Uint8Array {
  const maxChars = paperSize === '58mm' ? 32 : 48;
  const lineSeparator = '-'.repeat(maxChars);
  const doubleSeparator = '='.repeat(maxChars);

  const { transaction, items, storeProfile, receiptConfig } = detail;
  const storeName = (receiptConfig?.header || storeProfile?.name || 'SISISAWA KASIR').toUpperCase();
  const storeAddress = receiptConfig?.address || storeProfile?.address || '';
  const storePhone = storeProfile?.phone || storeProfile?.whatsapp || '';
  const storeFooter = receiptConfig?.footer || 'Terima Kasih Atas Kunjungan Anda!';

  const invoice = transaction.invoiceNumber || transaction.invoice_number || '-';
  const cashier = transaction.cashierName || transaction.cashier_name || 'Kasir';
  const datetime = formatReceiptDate(transaction.createdAt || transaction.created_at);
  const paymentMethod = transaction.paymentMethod || transaction.payment_method || 'Cash';

  const commands: number[] = [];

  // Helper push strings (ASCII / CodePage 437)
  const pushText = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      commands.push(str.charCodeAt(i) & 0xff);
    }
  };

  const pushLine = (str: string = '') => {
    pushText(str);
    commands.push(0x0a); // LF
  };

  // 1. ESC @ : Initialize Printer
  commands.push(0x1b, 0x40);

  // 2. Center Align (ESC a 1)
  commands.push(0x1b, 0x61, 0x01);

  // Store Header (Double Height & Width: GS ! 0x11)
  commands.push(0x1d, 0x21, 0x11);
  pushLine(storeName);

  // Reset to Normal Text (GS ! 0x00)
  commands.push(0x1d, 0x21, 0x00);
  if (storeAddress) pushLine(storeAddress);
  if (storePhone) pushLine(`Telp: ${storePhone}`);

  pushLine(doubleSeparator);

  // 3. Left Align for Meta Data (ESC a 0)
  commands.push(0x1b, 0x61, 0x00);
  pushLine(formatTwoColumns('No. Nota:', invoice, maxChars));
  if (receiptConfig?.show_datetime ?? true) {
    pushLine(formatTwoColumns('Waktu:', datetime, maxChars));
  }
  if (receiptConfig?.show_cashier ?? true) {
    pushLine(formatTwoColumns('Kasir:', cashier, maxChars));
  }
  pushLine(formatTwoColumns('Metode Bayar:', paymentMethod, maxChars));
  pushLine(lineSeparator);

  // 4. Item List
  for (const item of items) {
    const itemName = item.productName || item.product_name || 'Menu';
    const itemRows = formatItemRow(itemName, item.quantity, Number(item.price), Number(item.subtotal), maxChars);
    for (const r of itemRows) {
      pushLine(r);
    }
  }

  pushLine(lineSeparator);

  // 5. Financial Summary
  pushLine(formatTwoColumns('Subtotal:', `Rp ${formatReceiptMoney(Number(transaction.subtotal))}`, maxChars));

  if (Number(transaction.discount) > 0) {
    pushLine(formatTwoColumns('Diskon:', `-Rp ${formatReceiptMoney(Number(transaction.discount))}`, maxChars));
  }

  if (Number(transaction.tax) > 0) {
    pushLine(formatTwoColumns('Pajak (Tax):', `+Rp ${formatReceiptMoney(Number(transaction.tax))}`, maxChars));
  }

  pushLine(doubleSeparator);

  // Total (Bold: ESC E 1)
  commands.push(0x1b, 0x45, 0x01);
  pushLine(formatTwoColumns('TOTAL TAGIHAN:', `Rp ${formatReceiptMoney(Number(transaction.total))}`, maxChars));
  commands.push(0x1b, 0x45, 0x00); // Bold off

  pushLine(doubleSeparator);

  // 6. Footer Center Align (ESC a 1)
  commands.push(0x1b, 0x61, 0x01);
  pushLine(storeFooter);
  pushLine('Barang yang sudah dibeli');
  pushLine('tidak dapat dikembalikan.');

  // 7. Feed lines (4 lines so cutter doesn't cut through the footer)
  pushLine('');
  pushLine('');
  pushLine('');
  pushLine('');

  // 8. Auto Cut Paper command: GS V 65 3 (0x1D, 0x56, 0x41, 0x03)
  commands.push(0x1d, 0x56, 0x41, 0x03);

  return new Uint8Array(commands);
}

/**
 * Print via Web Bluetooth to Cashcow / Bluetooth Thermal Printers
 * Supports Android Tablets, Chrome on Android, & Web Bluetooth enabled browsers
 */
export async function printViaWebBluetooth(detail: TransactionDetail, paperSize: PaperSize = '58mm'): Promise<{ success: boolean; message: string }> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Browser ini belum mendukung Web Bluetooth. Silakan gunakan tombol Cetak Browser / RawBT.'
    };
  }

  try {
    const rawBuffer = buildEscPosBuffer(detail, paperSize);

    // Request Bluetooth device with typical POS printer service UUIDs or acceptAllDevices
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
        '0000ff00-0000-1000-8000-00805f9b34fb', // Custom POS Service
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // BLE Serial
      ]
    });

    if (!device.gatt) {
      throw new Error('GATT server tidak ditemukan pada perangkat printer.');
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    if (services.length === 0) {
      throw new Error('Tidak ada service Bluetooth yang dapat diakses pada printer ini.');
    }

    let writeCharacteristic: any = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
        if (writeCharacteristic) break;
      } catch (err) {
        // Continue searching other services
      }
    }

    if (!writeCharacteristic) {
      throw new Error('Karakteristik write Bluetooth untuk mencetak tidak ditemukan.');
    }

    // Send chunks (max 512 bytes per packet for BLE MTU stability)
    const chunkSize = 128;
    for (let i = 0; i < rawBuffer.length; i += chunkSize) {
      const chunk = rawBuffer.slice(i, i + chunkSize);
      if (writeCharacteristic.writeValueWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      // Small tick between chunks
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    if (device.gatt.connected) {
      setTimeout(() => device.gatt.disconnect(), 1000);
    }

    return {
      success: true,
      message: 'Struk berhasil dikirim ke printer thermal Cashcow!'
    };
  } catch (err: any) {
    console.error('Bluetooth Print error:', err);
    return {
      success: false,
      message: err.message || 'Koneksi Bluetooth printer dibatalkan atau gagal.'
    };
  }
}

/**
 * Print via RawBT (popular Android POS print app for Tablet & Phone)
 */
export function printViaRawBT(detail: TransactionDetail, paperSize: PaperSize = '58mm'): void {
  const rawBuffer = buildEscPosBuffer(detail, paperSize);
  let binary = '';
  const bytes = new Uint8Array(rawBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  window.location.href = `rawbt:data:application/octet-stream;base64,${base64}`;
}
