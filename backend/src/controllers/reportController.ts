import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/reports/monthly - Monthly Sales Performance & Comparisons
export async function getMonthlyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt(String(req.query.year), 10) || now.getFullYear();
    const month = parseInt(String(req.query.month), 10) || (now.getMonth() + 1); // 1-12

    // Current Month range
    const startCurrent = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endCurrent = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endCurrent.getDate();

    // Previous Month range
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const startPrev = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
    const endPrev = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    // 1. Current Month Summary
    const currentSummaryRes = await db.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(id)::int as total_transactions
       FROM transactions
       WHERE status = 'Completed'
         AND created_at >= $1 AND created_at <= $2`,
      [startCurrent.toISOString(), endCurrent.toISOString()]
    );
    const currentSales = Number(currentSummaryRes.rows[0]?.total_sales || 0);
    const currentTransactions = Number(currentSummaryRes.rows[0]?.total_transactions || 0);

    const currentItemsRes = await db.query(
      `SELECT COALESCE(SUM(ti.quantity), 0)::int as total_items
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.status = 'Completed'
         AND t.created_at >= $1 AND t.created_at <= $2`,
      [startCurrent.toISOString(), endCurrent.toISOString()]
    );
    const currentItems = Number(currentItemsRes.rows[0]?.total_items || 0);
    const currentAvg = currentTransactions > 0 ? Math.round(currentSales / currentTransactions) : 0;

    // 2. Previous Month Summary
    const prevSummaryRes = await db.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(id)::int as total_transactions
       FROM transactions
       WHERE status = 'Completed'
         AND created_at >= $1 AND created_at <= $2`,
      [startPrev.toISOString(), endPrev.toISOString()]
    );
    const prevSales = Number(prevSummaryRes.rows[0]?.total_sales || 0);
    const prevTransactions = Number(prevSummaryRes.rows[0]?.total_transactions || 0);

    const prevItemsRes = await db.query(
      `SELECT COALESCE(SUM(ti.quantity), 0)::int as total_items
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.status = 'Completed'
         AND t.created_at >= $1 AND t.created_at <= $2`,
      [startPrev.toISOString(), endPrev.toISOString()]
    );
    const prevItems = Number(prevItemsRes.rows[0]?.total_items || 0);
    const prevAvg = prevTransactions > 0 ? Math.round(prevSales / prevTransactions) : 0;

    // Helper for percentage growth
    const calculateGrowth = (current: number, previous: number): number | null => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // 3. Daily Sales aggregation for the month
    const dailyDataRes = await db.query(
      `SELECT 
        EXTRACT(DAY FROM created_at)::int as day_number,
        TO_CHAR(created_at, 'YYYY-MM-DD') as date_str,
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(id)::int as tx_count
       FROM transactions
       WHERE status = 'Completed'
         AND created_at >= $1 AND created_at <= $2
       GROUP BY EXTRACT(DAY FROM created_at), TO_CHAR(created_at, 'YYYY-MM-DD')
       ORDER BY day_number ASC`,
      [startCurrent.toISOString(), endCurrent.toISOString()]
    );

    const dailyMap: Record<number, { total: number; count: number }> = {};
    for (const row of dailyDataRes.rows) {
      dailyMap[row.day_number] = {
        total: Number(row.total_sales),
        count: Number(row.tx_count)
      };
    }

    // Build complete daily array from 1 to daysInMonth
    const dailyChart = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = dailyMap[d] || { total: 0, count: 0 };
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyChart.push({
        day: d,
        date: dateString,
        label: `Tgl ${d}`,
        total: dayData.total,
        count: dayData.count
      });
    }

    // 4. Top 5 Best Selling Products in selected month
    const topProductsRes = await db.query(
      `SELECT 
        ti.product_name,
        COALESCE(c.name, 'Umum') as category_name,
        SUM(ti.quantity)::int as total_qty,
        SUM(ti.subtotal) as total_revenue
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN products p ON ti.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE t.status = 'Completed'
         AND t.created_at >= $1 AND t.created_at <= $2
       GROUP BY ti.product_name, c.name
       ORDER BY total_qty DESC
       LIMIT 5`,
      [startCurrent.toISOString(), endCurrent.toISOString()]
    );

    // Get Store Profile for Header
    const storeRes = await db.query("SELECT value FROM settings WHERE key = 'store_profile'");

    res.json({
      success: true,
      data: {
        period: {
          year,
          month,
          monthName: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(year, month - 1, 1)),
          previousMonthName: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(prevYear, prevMonth - 1, 1))
        },
        summary: {
          totalSales: currentSales,
          totalTransactions: currentTransactions,
          totalItemsSold: currentItems,
          averageTransaction: currentAvg,
          comparison: {
            salesGrowth: calculateGrowth(currentSales, prevSales),
            transactionsGrowth: calculateGrowth(currentTransactions, prevTransactions),
            itemsGrowth: calculateGrowth(currentItems, prevItems),
            avgGrowth: calculateGrowth(currentAvg, prevAvg),
            prevTotalSales: prevSales,
            prevTotalTransactions: prevTransactions,
            prevTotalItemsSold: prevItems,
            prevAverageTransaction: prevAvg
          }
        },
        dailyChart,
        topProducts: topProductsRes.rows.map((r) => ({
          productName: r.product_name,
          categoryName: r.category_name,
          totalQty: Number(r.total_qty),
          totalRevenue: Number(r.total_revenue)
        })),
        storeProfile: storeRes.rows[0]?.value || null
      }
    });
  } catch (error) {
    console.error('getMonthlyReport error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat rekap laporan bulanan.' });
  }
}

// GET /api/reports/months - List available months with transactions
export async function getAvailableMonths(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT DISTINCT 
        EXTRACT(YEAR FROM created_at)::int as year,
        EXTRACT(MONTH FROM created_at)::int as month
       FROM transactions
       ORDER BY year DESC, month DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('getAvailableMonths error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar bulan.' });
  }
}
