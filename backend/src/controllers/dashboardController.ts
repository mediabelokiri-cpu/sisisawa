import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { range = '30d', startDate, endDate } = req.query;

    let dateFilterSql = "status = 'Completed'";
    const params: any[] = [];

    const now = new Date();

    if (range === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      params.push(startOfDay.toISOString());
      dateFilterSql += ` AND created_at >= $${params.length}`;
    } else if (range === '7d') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      params.push(past7.toISOString());
      dateFilterSql += ` AND created_at >= $${params.length}`;
    } else if (range === '30d') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      params.push(past30.toISOString());
      dateFilterSql += ` AND created_at >= $${params.length}`;
    } else if (range === 'custom' && startDate && endDate) {
      params.push(new Date(String(startDate)).toISOString());
      params.push(new Date(String(endDate)).toISOString());
      dateFilterSql += ` AND created_at >= $${params.length - 1} AND created_at <= $${params.length}`;
    }

    // 1. Total Penjualan & Total Transaksi
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(id) as total_transactions
      FROM transactions
      WHERE ${dateFilterSql}
    `;
    const summaryRes = await db.query(summaryQuery, params);
    const totalSales = Number(summaryRes.rows[0]?.total_sales || 0);
    const totalTransactions = Number(summaryRes.rows[0]?.total_transactions || 0);

    // 2. Total Item Terjual
    const itemsQuery = `
      SELECT COALESCE(SUM(ti.quantity), 0) as total_items_sold
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ${dateFilterSql.replace(/created_at/g, 't.created_at').replace(/status/g, 't.status')}
    `;
    const itemsRes = await db.query(itemsQuery, params);
    const totalItemsSold = Number(itemsRes.rows[0]?.total_items_sold || 0);

    // 3. Rata-rata Transaksi
    const averageTransaction = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

    // 4. Sales Chart Data
    // Group by day (or hour for today)
    const chartQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date_label,
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(id) as transaction_count
      FROM transactions
      WHERE ${dateFilterSql}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date_label ASC
    `;
    const chartRes = await db.query(chartQuery, params);

    // 5. Top 5 Produk Terlaris
    const topProductsQuery = `
      SELECT 
        ti.product_name,
        COALESCE(c.name, 'Umum') as category_name,
        SUM(ti.quantity) as total_qty,
        SUM(ti.subtotal) as total_revenue
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      LEFT JOIN products p ON ti.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${dateFilterSql.replace(/created_at/g, 't.created_at').replace(/status/g, 't.status')}
      GROUP BY ti.product_name, c.name
      ORDER BY total_qty DESC
      LIMIT 5
    `;
    const topProductsRes = await db.query(topProductsQuery, params);

    // 6. Transaksi Terbaru (Latest 6)
    const recentTxQuery = `
      SELECT 
        t.id,
        t.invoice_number,
        t.created_at,
        u.name as cashier_name,
        t.payment_method,
        t.total,
        t.status
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 6
    `;
    const recentTxRes = await db.query(recentTxQuery);

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalTransactions,
          totalItemsSold,
          averageTransaction
        },
        chartData: chartRes.rows.map((r) => ({
          date: r.date_label,
          total: Number(r.total_amount),
          count: Number(r.transaction_count)
        })),
        topProducts: topProductsRes.rows.map((r) => ({
          productName: r.product_name,
          categoryName: r.category_name,
          totalQty: Number(r.total_qty),
          totalRevenue: Number(r.total_revenue)
        })),
        recentTransactions: recentTxRes.rows
      }
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik dashboard.' });
  }
}

export async function getTransactionDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const txRes = await db.query(
      `SELECT 
        t.id,
        t.invoice_number,
        t.created_at,
        u.name as cashier_name,
        u.username as cashier_username,
        t.subtotal,
        t.discount,
        t.tax,
        t.total,
        t.payment_method,
        t.status
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1`,
      [id]
    );

    if (txRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const itemsRes = await db.query(
      `SELECT 
        id,
        product_id,
        product_name,
        price,
        quantity,
        subtotal
      FROM transaction_items
      WHERE transaction_id = $1`,
      [id]
    );

    // Get receipt settings
    const receiptRes = await db.query("SELECT value FROM settings WHERE key = 'receipt_config'");
    const storeRes = await db.query("SELECT value FROM settings WHERE key = 'store_profile'");

    res.json({
      success: true,
      data: {
        transaction: txRes.rows[0],
        items: itemsRes.rows,
        receiptConfig: receiptRes.rows[0]?.value || null,
        storeProfile: storeRes.rows[0]?.value || null
      }
    });
  } catch (error) {
    console.error('getTransactionDetail error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail transaksi.' });
  }
}
