import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/transactions - List all transactions with multi-filters
export async function getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      search,
      cashierId,
      paymentMethod,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    let query = `
      SELECT 
        t.id,
        t.invoice_number,
        t.user_id,
        u.name as cashier_name,
        u.username as cashier_username,
        t.subtotal,
        t.discount,
        t.tax,
        t.total,
        t.payment_method,
        t.status,
        t.created_at,
        t.updated_at,
        (SELECT COUNT(ti.id)::int FROM transaction_items ti WHERE ti.transaction_id = t.id) as item_count
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter Search (Invoice Number)
    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim()}%`);
      query += ` AND (t.invoice_number ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
    }

    // Filter Cashier
    if (cashierId && String(cashierId) !== 'all' && !isNaN(Number(cashierId))) {
      params.push(Number(cashierId));
      query += ` AND t.user_id = $${params.length}`;
    }

    // Filter Payment Method
    if (paymentMethod && paymentMethod !== 'all' && ['Cash', 'QRIS', 'Debit', 'Transfer'].includes(String(paymentMethod))) {
      params.push(paymentMethod);
      query += ` AND t.payment_method = $${params.length}`;
    }

    // Filter Status
    if (status && status !== 'ALL' && ['Completed', 'Cancelled'].includes(String(status))) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    // Filter Date Range
    if (startDate && String(startDate).trim() !== '') {
      params.push(new Date(String(startDate)).toISOString());
      query += ` AND t.created_at >= $${params.length}`;
    }

    if (endDate && String(endDate).trim() !== '') {
      // Set to end of the day if date only string
      const end = new Date(String(endDate));
      if (String(endDate).length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      params.push(end.toISOString());
      query += ` AND t.created_at <= $${params.length}`;
    }

    query += ` ORDER BY t.created_at DESC`;

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum);
    const limitParamIdx = params.length;
    params.push(offset);
    const offsetParamIdx = params.length;

    const pagedQuery = `${query} LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`;

    const result = await db.query(pagedQuery, params);

    // Get Total Count for pagination
    const countQuery = `
      SELECT COUNT(t.id)::int as total
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
      ${search && String(search).trim() !== '' ? `AND (t.invoice_number ILIKE '%${String(search).trim()}%' OR u.name ILIKE '%${String(search).trim()}%')` : ''}
      ${cashierId && String(cashierId) !== 'all' && !isNaN(Number(cashierId)) ? `AND t.user_id = ${Number(cashierId)}` : ''}
      ${paymentMethod && paymentMethod !== 'all' && ['Cash', 'QRIS', 'Debit', 'Transfer'].includes(String(paymentMethod)) ? `AND t.payment_method = '${paymentMethod}'` : ''}
      ${status && status !== 'ALL' && ['Completed', 'Cancelled'].includes(String(status)) ? `AND t.status = '${status}'` : ''}
      ${startDate && String(startDate).trim() !== '' ? `AND t.created_at >= '${new Date(String(startDate)).toISOString()}'` : ''}
      ${endDate && String(endDate).trim() !== '' ? `AND t.created_at <= '${new Date(String(endDate)).toISOString()}'` : ''}
    `;
    const countRes = await db.query(countQuery);
    const totalRecords = Number(countRes.rows[0]?.total || result.rows.length);

    res.json({
      success: true,
      data: {
        transactions: result.rows.map((r) => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          userId: r.user_id,
          cashierName: r.cashier_name,
          cashierUsername: r.cashier_username,
          subtotal: Number(r.subtotal),
          discount: Number(r.discount),
          tax: Number(r.tax),
          total: Number(r.total),
          paymentMethod: r.payment_method,
          status: r.status,
          itemCount: Number(r.item_count),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar transaksi.' });
  }
}

// GET /api/transactions/cashiers - Get list of cashiers for filter dropdown
export async function getCashiersForFilter(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      'SELECT id, name, username, role FROM users ORDER BY name ASC'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('getCashiersForFilter error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar kasir.' });
  }
}

// GET /api/transactions/:id - Detail transaction with items & receipt configuration
export async function getTransactionById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const txRes = await db.query(
      `SELECT 
        t.id,
        t.invoice_number,
        t.user_id,
        u.name as cashier_name,
        u.username as cashier_username,
        t.subtotal,
        t.discount,
        t.tax,
        t.total,
        t.payment_method,
        t.status,
        t.created_at,
        t.updated_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1`,
      [id]
    );

    if (txRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const tx = txRes.rows[0];

    const itemsRes = await db.query(
      `SELECT 
        id,
        product_id,
        product_name,
        price,
        quantity,
        subtotal
      FROM transaction_items
      WHERE transaction_id = $1
      ORDER BY id ASC`,
      [id]
    );

    // Get Store Profile & Receipt Settings
    const storeRes = await db.query("SELECT value FROM settings WHERE key = 'store_profile'");
    const receiptRes = await db.query("SELECT value FROM settings WHERE key = 'receipt_config'");

    res.json({
      success: true,
      data: {
        transaction: {
          id: tx.id,
          invoiceNumber: tx.invoice_number,
          userId: tx.user_id,
          cashierName: tx.cashier_name,
          cashierUsername: tx.cashier_username,
          subtotal: Number(tx.subtotal),
          discount: Number(tx.discount),
          tax: Number(tx.tax),
          total: Number(tx.total),
          paymentMethod: tx.payment_method,
          status: tx.status,
          createdAt: tx.created_at,
          updatedAt: tx.updated_at
        },
        items: itemsRes.rows.map((i) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          price: Number(i.price),
          quantity: Number(i.quantity),
          subtotal: Number(i.subtotal)
        })),
        storeProfile: storeRes.rows[0]?.value || null,
        receiptConfig: receiptRes.rows[0]?.value || null
      }
    });
  } catch (error) {
    console.error('getTransactionById error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail transaksi.' });
  }
}

// PATCH /api/transactions/:id/cancel - Cancel transaction
export async function cancelTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existRes = await db.query(
      'SELECT id, invoice_number, status FROM transactions WHERE id = $1',
      [id]
    );

    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const tx = existRes.rows[0];

    if (tx.status === 'Cancelled') {
      res.status(400).json({
        success: false,
        message: `Transaksi dengan nomor invoice ${tx.invoice_number} sudah berstatus Cancelled.`
      });
      return;
    }

    await db.query(
      "UPDATE transactions SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.json({
      success: true,
      message: `Transaksi ${tx.invoice_number} berhasil dibatalkan (Status: Cancelled).`,
      data: { id: Number(id), status: 'Cancelled' }
    });
  } catch (error) {
    console.error('cancelTransaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal membatalkan transaksi.' });
  }
}

// POST /api/transactions - Create new transaction (for testing flow or cashier)
export async function createTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'Cash';
    const discount = req.body.discount || 0;
    const tax = req.body.tax || 0;
    const items = req.body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Daftar item produk wajib diisi.' });
      return;
    }

    if (!['Cash', 'QRIS', 'Debit', 'Transfer'].includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'Metode pembayaran tidak valid.' });
      return;
    }

    const userId = req.user?.id || 1;

    // Generate Invoice Number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randSuffix}`;

    // Validate products and calculate subtotals
    let calculatedSubtotal = 0;
    const validatedItems: Array<{
      productId: number;
      productName: string;
      price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const it of items) {
      const prodId = it.productId ?? it.product_id ?? it.id;
      if (!prodId) {
        res.status(400).json({ success: false, message: 'ID produk tidak valid atau kosong.' });
        return;
      }

      const pRes = await db.query('SELECT id, name, sell_price, status FROM products WHERE id = $1', [prodId]);
      if (pRes.rows.length === 0) {
        res.status(400).json({ success: false, message: `Produk ID ${prodId} tidak ditemukan.` });
        return;
      }
      const p = pRes.rows[0];
      const qty = Math.max(1, parseInt(String(it.quantity ?? it.qty ?? 1), 10) || 1);
      const price = Number(p.sell_price);
      const itemSubtotal = price * qty;
      calculatedSubtotal += itemSubtotal;

      validatedItems.push({
        productId: p.id,
        productName: p.name,
        price,
        quantity: qty,
        subtotal: itemSubtotal
      });
    }

    const numDiscount = Math.max(0, Number(discount) || 0);
    const numTax = Math.max(0, Number(tax) || 0);
    const finalTotal = Math.max(0, calculatedSubtotal - numDiscount + numTax);

    // Insert Transaction
    const txRes = await db.query(
      `INSERT INTO transactions (invoice_number, user_id, subtotal, discount, tax, total, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Completed')
       RETURNING id, invoice_number, user_id, subtotal, discount, tax, total, payment_method, status, created_at`,
      [
        invoiceNumber,
        userId,
        calculatedSubtotal,
        numDiscount,
        numTax,
        finalTotal,
        paymentMethod
      ]
    );

    const newTxId = txRes.rows[0].id;

    // Insert Transaction Items
    for (const vi of validatedItems) {
      await db.query(
        `INSERT INTO transaction_items (transaction_id, product_id, product_name, price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newTxId, vi.productId, vi.productName, vi.price, vi.quantity, vi.subtotal]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil dibuat.',
      data: {
        ...txRes.rows[0],
        id: newTxId,
        transaction_id: newTxId,
        items: validatedItems
      }
    });
  } catch (error) {
    console.error('createTransaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat transaksi baru.' });
  }
}

// DELETE /api/transactions/:id - Delete a single transaction (Admin Only)
export async function deleteTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = String(req.params.id);
    const txId = parseInt(idParam, 10);

    if (isNaN(txId)) {
      res.status(400).json({ success: false, message: 'ID transaksi tidak valid.' });
      return;
    }

    const checkRes = await db.query('SELECT id, invoice_number FROM transactions WHERE id = $1', [txId]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const invoiceNumber = checkRes.rows[0].invoice_number;

    // Delete items first
    await db.query('DELETE FROM transaction_items WHERE transaction_id = $1', [txId]);
    // Delete transaction
    await db.query('DELETE FROM transactions WHERE id = $1', [txId]);

    res.json({
      success: true,
      message: `Transaksi ${invoiceNumber} berhasil dihapus permanen.`
    });
  } catch (error) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi.' });
  }
}

// DELETE /api/transactions/clear-all - Clear/Reset all transactions (Admin Only)
export async function clearAllTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await db.query('DELETE FROM transaction_items');
    await db.query('DELETE FROM transactions');

    res.json({
      success: true,
      message: 'Seluruh riwayat transaksi berhasil dibersihkan.'
    });
  } catch (error) {
    console.error('clearAllTransactions error:', error);
    res.status(500).json({ success: false, message: 'Gagal membersihkan riwayat transaksi.' });
  }
}

