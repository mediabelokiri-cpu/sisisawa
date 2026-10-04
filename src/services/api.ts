import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

const wrapResponse = <T>(data: T) => ({ data });

function parseUrl(url: string) {
  const [pathname, queryString] = url.split('?');
  const query: Record<string, string> = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    params.forEach((v, k) => {
      query[k] = v;
    });
  }
  const cleanPath = pathname.replace(/^\/api/, '').replace(/^\//, '');
  return { path: cleanPath, query };
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

export const api = {
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },

  async get(url: string, _config?: any): Promise<any> {
    const { path, query } = parseUrl(url);

    // 1. Health check
    if (path === 'health' || path === '') {
      return wrapResponse({
        status: 'ok',
        databaseConnected: true,
        message: 'SISISAWA POS (Supabase Direct) is running',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Auth: Current User Profile
    if (path === 'auth/me') {
      const savedUserStr = localStorage.getItem('kasirku_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      if (!savedUser) {
        throw { response: { status: 401, data: { message: 'Tidak terotentikasi.' } } };
      }

      const { data: userRecord } = await supabase
        .from('users')
        .select('id, name, username, role, status')
        .eq('id', savedUser.id)
        .single();

      const { data: storeSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'store_profile')
        .single();

      return wrapResponse({
        success: true,
        data: {
          user: userRecord || savedUser,
          storeProfile: storeSetting?.value || null,
        },
      });
    }

    // 3. Categories List
    if (path === 'categories') {
      let queryBuilder = supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (query.search) {
        queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) throw { response: { data: { message: error.message } } };

      const { data: prods } = await supabase.from('products').select('category_id');
      const counts: Record<number, number> = {};
      if (prods) {
        prods.forEach((p) => {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        });
      }

      const formatted = (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        product_count: counts[c.id] || 0,
        productCount: counts[c.id] || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      return wrapResponse({ success: true, data: formatted });
    }

    // 4. Products List
    if (path === 'products') {
      let queryBuilder = supabase
        .from('products')
        .select('*, categories(id, name)')
        .order('created_at', { ascending: false });

      if (query.category_id && query.category_id !== 'all') {
        queryBuilder = queryBuilder.eq('category_id', Number(query.category_id));
      }
      if (query.status && query.status !== 'ALL') {
        queryBuilder = queryBuilder.eq('status', query.status);
      }
      if (query.search) {
        queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) throw { response: { data: { message: error.message } } };

      const formatted = (data || []).map((p: any) => {
        const buyPrice = p.buy_price !== null ? Number(p.buy_price) : null;
        const sellPrice = Number(p.sell_price);
        const profit = buyPrice !== null ? sellPrice - buyPrice : null;
        return {
          id: p.id,
          name: p.name,
          categoryId: p.category_id,
          categoryName: p.categories?.name || 'Tanpa Kategori',
          buyPrice,
          sellPrice,
          profit,
          imageUrl: p.image_url,
          icon: p.icon,
          sku: p.sku,
          status: p.status,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
      });

      return wrapResponse({ success: true, data: formatted });
    }

    // 5. Dashboard Stats: /dashboard/stats
    if (path === 'dashboard/stats') {
      const range = query.range || '30d';
      const now = new Date();
      let startDate = new Date();

      if (range === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (range === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === 'custom' && query.startDate) {
        startDate = new Date(query.startDate);
      } else {
        // 30d default
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const { data: txs } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const { data: allTxsRaw } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });

      const filteredTxs = txs || [];
      const allTxs = allTxsRaw || [];

      // Calculate totals for selected range
      const totalSales = filteredTxs.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const totalTransactions = filteredTxs.length;
      let totalItemsSold = 0;
      filteredTxs.forEach((t) => {
        (t.transaction_items || []).forEach((i: any) => {
          totalItemsSold += Number(i.quantity || 0);
        });
      });
      const averageTransaction =
        totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

      // Group chart data by date
      const chartMap: Record<string, { date: string; total: number; count: number }> = {};
      filteredTxs.forEach((t) => {
        const dateKey = t.created_at.split('T')[0];
        if (!chartMap[dateKey]) {
          chartMap[dateKey] = { date: dateKey, total: 0, count: 0 };
        }
        chartMap[dateKey].total += Number(t.total_amount);
        chartMap[dateKey].count += 1;
      });
      const chartData = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate top products
      const productMap: Record<string, { productName: string; categoryName: string; totalQty: number; totalRevenue: number }> = {};
      filteredTxs.forEach((t) => {
        (t.transaction_items || []).forEach((i: any) => {
          const key = i.product_name;
          if (!productMap[key]) {
            productMap[key] = {
              productName: i.product_name,
              categoryName: i.category_name || 'Umum',
              totalQty: 0,
              totalRevenue: 0,
            };
          }
          productMap[key].totalQty += Number(i.quantity || 0);
          productMap[key].totalRevenue += Number(i.subtotal || 0);
        });
      });
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);

      // Recent 5 transactions
      const recentTransactions = allTxs.slice(0, 5).map((t: any) => ({
        id: t.id,
        invoiceNumber: t.invoice_number,
        invoice_number: t.invoice_number,
        cashierName: t.cashier_name,
        cashier_name: t.cashier_name,
        total: Number(t.total_amount),
        totalAmount: Number(t.total_amount),
        paymentMethod: t.payment_method,
        payment_method: t.payment_method,
        status: t.status || 'Completed',
        createdAt: t.created_at,
        created_at: t.created_at,
        itemCount: (t.transaction_items || []).reduce(
          (sum: number, i: any) => sum + Number(i.quantity || 0),
          0
        ),
      }));

      return wrapResponse({
        success: true,
        data: {
          summary: {
            totalSales,
            totalTransactions,
            totalItemsSold,
            averageTransaction,
          },
          chartData,
          topProducts,
          recentTransactions,
        },
      });
    }

    // 6. Cashiers List for Transaction Filter: /transactions/cashiers
    if (path === 'transactions/cashiers') {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, role')
        .order('name', { ascending: true });

      if (error) throw { response: { data: { message: error.message } } };

      return wrapResponse({
        success: true,
        data: data || [],
      });
    }

    // 7. Single Transaction Detail: /dashboard/transactions/:id or /transactions/:id
    if (path.startsWith('dashboard/transactions/') || (path.startsWith('transactions/') && !path.includes('cashiers'))) {
      const parts = path.split('/');
      const id = Number(parts[parts.length - 1]);

      if (isNaN(id)) {
        throw { response: { status: 400, data: { message: 'ID transaksi tidak valid.' } } };
      }

      const { data: t, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .eq('id', id)
        .single();

      if (error || !t) throw { response: { data: { message: 'Transaksi tidak ditemukan.' } } };

      const { data: receiptSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'receipt_config')
        .single();

      const { data: storeSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'store_profile')
        .single();

      return wrapResponse({
        success: true,
        data: {
          transaction: {
            id: t.id,
            invoiceNumber: t.invoice_number,
            invoice_number: t.invoice_number,
            createdAt: t.created_at,
            created_at: t.created_at,
            cashierId: t.cashier_id,
            cashier_id: t.cashier_id,
            cashierName: t.cashier_name,
            cashier_name: t.cashier_name,
            subtotal: Number(t.subtotal),
            discount: Number(t.discount),
            tax: Number(t.tax),
            total: Number(t.total_amount),
            totalAmount: Number(t.total_amount),
            total_amount: Number(t.total_amount),
            cashAmount: t.cash_amount !== null ? Number(t.cash_amount) : null,
            cash_amount: t.cash_amount !== null ? Number(t.cash_amount) : null,
            changeAmount: t.change_amount !== null ? Number(t.change_amount) : null,
            change_amount: t.change_amount !== null ? Number(t.change_amount) : null,
            paymentMethod: t.payment_method,
            payment_method: t.payment_method,
            status: t.status || 'Completed',
            notes: t.notes,
          },
          items: (t.transaction_items || []).map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            product_id: item.product_id,
            productName: item.product_name,
            product_name: item.product_name,
            categoryName: item.category_name || 'Umum',
            category_name: item.category_name || 'Umum',
            price: Number(item.sell_price),
            sellPrice: Number(item.sell_price),
            sell_price: Number(item.sell_price),
            buyPrice: item.buy_price !== null ? Number(item.buy_price) : null,
            buy_price: item.buy_price !== null ? Number(item.buy_price) : null,
            quantity: Number(item.quantity),
            subtotal: Number(item.subtotal),
          })),
          receiptConfig: receiptSetting?.value || null,
          storeProfile: storeSetting?.value || null,
        },
      });
    }

    // 8. Transactions List: /transactions
    if (path === 'transactions') {
      let queryBuilder = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });

      if (query.startDate) {
        queryBuilder = queryBuilder.gte('created_at', query.startDate);
      } else if (query.start_date) {
        queryBuilder = queryBuilder.gte('created_at', `${query.start_date}T00:00:00Z`);
      }

      if (query.endDate) {
        queryBuilder = queryBuilder.lte('created_at', query.endDate);
      } else if (query.end_date) {
        queryBuilder = queryBuilder.lte('created_at', `${query.end_date}T23:59:59Z`);
      }

      if (query.paymentMethod && query.paymentMethod !== 'all') {
        queryBuilder = queryBuilder.eq('payment_method', query.paymentMethod);
      } else if (query.payment_method && query.payment_method !== 'all') {
        queryBuilder = queryBuilder.eq('payment_method', query.payment_method);
      }

      if (query.cashierId && query.cashierId !== 'all') {
        queryBuilder = queryBuilder.eq('cashier_id', Number(query.cashierId));
      } else if (query.cashier_id && query.cashier_id !== 'all') {
        queryBuilder = queryBuilder.eq('cashier_id', Number(query.cashier_id));
      }

      if (query.status && query.status !== 'ALL') {
        queryBuilder = queryBuilder.eq('status', query.status);
      }

      const searchKeyword = query.search || query.invoice;
      if (searchKeyword) {
        queryBuilder = queryBuilder.ilike('invoice_number', `%${searchKeyword}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) throw { response: { data: { message: error.message } } };

      const allRows = data || [];
      const total = allRows.length;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const startIndex = (page - 1) * limit;
      const paginatedRows = allRows.slice(startIndex, startIndex + limit);

      const formatted = paginatedRows.map((t: any) => ({
        id: t.id,
        invoiceNumber: t.invoice_number,
        invoice_number: t.invoice_number,
        cashierId: t.cashier_id,
        cashier_id: t.cashier_id,
        cashierName: t.cashier_name,
        cashier_name: t.cashier_name,
        subtotal: Number(t.subtotal),
        discount: Number(t.discount),
        tax: Number(t.tax),
        total: Number(t.total_amount),
        totalAmount: Number(t.total_amount),
        total_amount: Number(t.total_amount),
        cashAmount: t.cash_amount !== null ? Number(t.cash_amount) : null,
        cash_amount: t.cash_amount !== null ? Number(t.cash_amount) : null,
        changeAmount: t.change_amount !== null ? Number(t.change_amount) : null,
        change_amount: t.change_amount !== null ? Number(t.change_amount) : null,
        paymentMethod: t.payment_method,
        payment_method: t.payment_method,
        status: t.status || 'Completed',
        notes: t.notes,
        createdAt: t.created_at,
        created_at: t.created_at,
        itemCount: (t.transaction_items || []).reduce(
          (sum: number, i: any) => sum + Number(i.quantity || 0),
          0
        ),
        items: (t.transaction_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          product_id: item.product_id,
          productName: item.product_name,
          product_name: item.product_name,
          categoryName: item.category_name || 'Umum',
          category_name: item.category_name || 'Umum',
          buyPrice: item.buy_price !== null ? Number(item.buy_price) : null,
          buy_price: item.buy_price !== null ? Number(item.buy_price) : null,
          price: Number(item.sell_price),
          sellPrice: Number(item.sell_price),
          sell_price: Number(item.sell_price),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
        })),
      }));

      return wrapResponse({
        success: true,
        data: {
          transactions: formatted,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    }

    // 9. Monthly Report: /reports/monthly
    if (path === 'reports/monthly') {
      const year = Number(query.year) || new Date().getFullYear();
      const month = Number(query.month) || new Date().getMonth() + 1; // 1-12

      const monthName = `${INDO_MONTHS[month - 1]} ${year}`;
      const prevMonthNum = month === 1 ? 12 : month - 1;
      const prevYearNum = month === 1 ? year - 1 : year;
      const previousMonthName = `${INDO_MONTHS[prevMonthNum - 1]} ${prevYearNum}`;

      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

      const prevStartDate = new Date(Date.UTC(prevYearNum, prevMonthNum - 1, 1, 0, 0, 0)).toISOString();
      const prevEndDate = new Date(Date.UTC(prevYearNum, prevMonthNum, 0, 23, 59, 59, 999)).toISOString();

      // Current month transactions
      const { data: currentTxs, error: currErr } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (currErr) throw { response: { data: { message: currErr.message } } };

      // Previous month transactions
      const { data: prevTxs } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', prevStartDate)
        .lte('created_at', prevEndDate);

      const allCurr = currentTxs || [];
      const allPrev = prevTxs || [];

      // Current Month Summary
      const totalSales = allCurr.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const totalTransactions = allCurr.length;
      let totalItemsSold = 0;
      allCurr.forEach((t) => {
        (t.transaction_items || []).forEach((item: any) => {
          totalItemsSold += Number(item.quantity || 0);
        });
      });
      const averageTransaction =
        totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

      // Previous Month Summary
      const prevTotalSales = allPrev.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const prevTotalTransactions = allPrev.length;
      let prevTotalItemsSold = 0;
      allPrev.forEach((t) => {
        (t.transaction_items || []).forEach((item: any) => {
          prevTotalItemsSold += Number(item.quantity || 0);
        });
      });
      const prevAverageTransaction =
        prevTotalTransactions > 0 ? Math.round(prevTotalSales / prevTotalTransactions) : 0;

      // Growth calculations
      const salesGrowth =
        prevTotalSales > 0
          ? Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 1000) / 10
          : null;
      const transactionsGrowth =
        prevTotalTransactions > 0
          ? Math.round(((totalTransactions - prevTotalTransactions) / prevTotalTransactions) * 1000) / 10
          : null;
      const itemsGrowth =
        prevTotalItemsSold > 0
          ? Math.round(((totalItemsSold - prevTotalItemsSold) / prevTotalItemsSold) * 1000) / 10
          : null;
      const avgGrowth =
        prevAverageTransaction > 0
          ? Math.round(((averageTransaction - prevAverageTransaction) / prevAverageTransaction) * 1000) / 10
          : null;

      // Daily chart for every day in month
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyMap: Record<number, { total: number; count: number }> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap[d] = { total: 0, count: 0 };
      }

      allCurr.forEach((t) => {
        const txDate = new Date(t.created_at);
        const day = txDate.getUTCDate();
        if (dailyMap[day]) {
          dailyMap[day].total += Number(t.total_amount);
          dailyMap[day].count += 1;
        }
      });

      const dailyChart = Object.keys(dailyMap).map((dayStr) => {
        const dayNum = Number(dayStr);
        const paddedDay = String(dayNum).padStart(2, '0');
        const paddedMonth = String(month).padStart(2, '0');
        return {
          day: dayNum,
          date: `${year}-${paddedMonth}-${paddedDay}`,
          label: `${paddedDay} ${INDO_MONTHS_SHORT[month - 1]}`,
          total: dailyMap[dayNum].total,
          count: dailyMap[dayNum].count,
        };
      });

      // Top products in month
      const productMap: Record<string, { productName: string; categoryName: string; totalQty: number; totalRevenue: number }> = {};
      allCurr.forEach((t) => {
        (t.transaction_items || []).forEach((item: any) => {
          const key = item.product_name;
          if (!productMap[key]) {
            productMap[key] = {
              productName: item.product_name,
              categoryName: item.category_name || 'Umum',
              totalQty: 0,
              totalRevenue: 0,
            };
          }
          productMap[key].totalQty += Number(item.quantity || 0);
          productMap[key].totalRevenue += Number(item.subtotal || 0);
        });
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 10);

      // Store profile
      const { data: storeSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'store_profile')
        .single();

      return wrapResponse({
        success: true,
        data: {
          period: {
            year,
            month,
            monthName,
            previousMonthName,
          },
          summary: {
            totalSales,
            totalTransactions,
            totalItemsSold,
            averageTransaction,
            comparison: {
              salesGrowth,
              transactionsGrowth,
              itemsGrowth,
              avgGrowth,
              prevTotalSales,
              prevTotalTransactions,
              prevTotalItemsSold,
              prevAverageTransaction,
            },
          },
          dailyChart,
          topProducts,
          storeProfile: storeSetting?.value || null,
        },
      });
    }

    // 10. Users / Kasir List: /users
    if (path === 'users') {
      let queryBuilder = supabase
        .from('users')
        .select('id, name, username, role, status, created_at, updated_at')
        .order('id', { ascending: true });

      if (query.role && query.role !== 'ALL') {
        queryBuilder = queryBuilder.eq('role', query.role);
      }
      if (query.status && query.status !== 'ALL') {
        queryBuilder = queryBuilder.eq('status', query.status);
      }
      if (query.search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,username.ilike.%${query.search}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) throw { response: { data: { message: error.message } } };

      const { data: allTxs } = await supabase.from('transactions').select('cashier_id');
      const txCounts: Record<number, number> = {};
      if (allTxs) {
        allTxs.forEach((t) => {
          if (t.cashier_id) {
            txCounts[t.cashier_id] = (txCounts[t.cashier_id] || 0) + 1;
          }
        });
      }

      const formatted = (data || []).map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        status: u.status,
        transactionCount: txCounts[u.id] || 0,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      return wrapResponse({ success: true, data: formatted });
    }

    // 11. Settings List: /settings
    if (path === 'settings') {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw { response: { data: { message: error.message } } };

      const settingsMap: Record<string, any> = {};
      (data || []).forEach((s) => {
        settingsMap[s.key] = s.value;
      });

      return wrapResponse({ success: true, data: settingsMap });
    }

    throw { response: { status: 404, data: { message: `Route GET /${path} not found` } } };
  },

  async post(url: string, bodyData: any = {}, _config?: any): Promise<any> {
    const { path } = parseUrl(url);

    // 1. Auth Login: /auth/login
    if (path === 'auth/login') {
      const { username, password } = bodyData;
      if (!username || !password) {
        throw { response: { status: 400, data: { message: 'Username dan password wajib diisi.' } } };
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', String(username).trim());

      if (error || !users || users.length === 0) {
        throw { response: { status: 401, data: { message: 'Username atau password salah.' } } };
      }

      const user = users[0];
      if (user.status !== 'Active') {
        throw { response: { status: 403, data: { message: 'Akun Anda sedang nonaktif. Hubungi Admin.' } } };
      }

      const isMatch = bcrypt.compareSync(String(password), user.password_hash);
      if (!isMatch) {
        throw { response: { status: 401, data: { message: 'Username atau password salah.' } } };
      }

      const token = `sb_token_${user.id}_${Date.now()}`;
      const safeUser = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      };

      return wrapResponse({
        success: true,
        message: 'Login berhasil.',
        data: { token, user: safeUser },
      });
    }

    // 2. Add Category: /categories
    if (path === 'categories') {
      const { name, icon } = bodyData;
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: String(name).trim(),
          icon: icon || 'Tag',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Kategori berhasil ditambahkan.',
        data: {
          id: data.id,
          name: data.name,
          icon: data.icon,
          product_count: 0,
          productCount: 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    // 3. Add Product: /products
    if (path === 'products') {
      const { name, categoryId, buyPrice, sellPrice, imageUrl, icon, sku, status } = bodyData;
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: String(name).trim(),
          category_id: Number(categoryId),
          buy_price: buyPrice !== '' && buyPrice !== null ? Number(buyPrice) : null,
          sell_price: Number(sellPrice),
          image_url: imageUrl || null,
          icon: icon || null,
          sku: sku ? String(sku).trim() : null,
          status: status || 'AVAILABLE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*, categories(id, name)')
        .single();

      if (error) throw { response: { data: { message: error.message } } };

      const buy = data.buy_price !== null ? Number(data.buy_price) : null;
      const sell = Number(data.sell_price);
      return wrapResponse({
        success: true,
        message: 'Produk berhasil ditambahkan.',
        data: {
          id: data.id,
          name: data.name,
          categoryId: data.category_id,
          categoryName: data.categories?.name || 'Tanpa Kategori',
          buyPrice: buy,
          sellPrice: sell,
          profit: buy !== null ? sell - buy : null,
          imageUrl: data.image_url,
          icon: data.icon,
          sku: data.sku,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    // 4. Create Transaction: /transactions
    if (path === 'transactions') {
      const {
        invoiceNumber,
        cashierId,
        cashierName,
        subtotal,
        discount,
        tax,
        totalAmount,
        cashAmount,
        changeAmount,
        paymentMethod,
        payment_method,
        notes,
        items,
      } = bodyData;

      // Extract saved cashier if available
      const savedUserStr = localStorage.getItem('kasirku_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      const effectiveCashierId = cashierId || savedUser?.id || null;
      const effectiveCashierName = cashierName || savedUser?.name || 'Kasir';
      const effectivePaymentMethod = paymentMethod || payment_method || 'Cash';

      // Generate invoice format INV-YYYYMMDD-XXXX if not supplied
      const now = new Date();
      const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedInvoice = invoiceNumber || `INV-${dateCode}-${randomSuffix}`;

      // Calculate subtotal and total if missing
      const calculatedSubtotal =
        subtotal !== undefined
          ? Number(subtotal)
          : (items || []).reduce((sum: number, item: any) => sum + Number(item.price || item.sellPrice || 0) * Number(item.quantity || 1), 0);

      const effectiveDiscount = Number(discount || 0);
      const effectiveTax = Number(tax || 0);
      const calculatedTotal =
        totalAmount !== undefined
          ? Number(totalAmount)
          : Math.max(0, calculatedSubtotal - effectiveDiscount + effectiveTax);

      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          invoice_number: generatedInvoice,
          cashier_id: effectiveCashierId,
          cashier_name: effectiveCashierName,
          subtotal: calculatedSubtotal,
          discount: effectiveDiscount,
          tax: effectiveTax,
          total_amount: calculatedTotal,
          cash_amount: cashAmount !== null && cashAmount !== undefined ? Number(cashAmount) : null,
          change_amount: changeAmount !== null && changeAmount !== undefined ? Number(changeAmount) : null,
          payment_method: effectivePaymentMethod,
          notes: notes || null,
          status: 'Completed',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) throw { response: { data: { message: txError.message } } };

      if (items && items.length > 0) {
        // Look up category and buy_price for items if not present
        const productIds = items.map((i: any) => i.productId || i.product_id).filter(Boolean);
        let productsMap: Record<number, any> = {};
        if (productIds.length > 0) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, buy_price, sell_price, category_id, categories(name)')
            .in('id', productIds);
          if (prods) {
            prods.forEach((p: any) => {
              productsMap[p.id] = p;
            });
          }
        }

        const itemRows = items.map((item: any) => {
          const pid = item.productId || item.product_id || null;
          const prodInfo = pid ? productsMap[pid] : null;
          const sellPrice = Number(item.sellPrice || item.price || prodInfo?.sell_price || 0);
          const buyPrice = item.buyPrice !== undefined && item.buyPrice !== null
            ? Number(item.buyPrice)
            : (prodInfo?.buy_price !== null && prodInfo?.buy_price !== undefined ? Number(prodInfo.buy_price) : null);
          const quantity = Number(item.quantity || 1);
          const itemSubtotal = Number(item.subtotal || sellPrice * quantity);

          return {
            transaction_id: tx.id,
            product_id: pid,
            product_name: item.productName || item.name || prodInfo?.name || 'Produk',
            category_name: item.categoryName || prodInfo?.categories?.name || 'Umum',
            buy_price: buyPrice,
            sell_price: sellPrice,
            quantity: quantity,
            subtotal: itemSubtotal,
          };
        });

        const { error: itemsError } = await supabase.from('transaction_items').insert(itemRows);
        if (itemsError) console.error('Error inserting transaction items:', itemsError);
      }

      return wrapResponse({
        success: true,
        message: 'Transaksi berhasil disimpan.',
        data: {
          id: tx.id,
          transaction_id: tx.id,
          invoiceNumber: tx.invoice_number,
          invoice_number: tx.invoice_number,
          totalAmount: Number(tx.total_amount),
        },
      });
    }

    // 5. Add User: /users
    if (path === 'users') {
      const { name, username, password, role, status } = bodyData;
      if (!name || !username || !password) {
        throw { response: { status: 400, data: { message: 'Nama, username, dan password wajib diisi.' } } };
      }

      const passwordHash = bcrypt.hashSync(String(password), 10);
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: String(name).trim(),
          username: String(username).trim(),
          password_hash: passwordHash,
          role: role || 'KASIR',
          status: status || 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, name, username, role, status, created_at, updated_at')
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Pengguna berhasil dibuat.',
        data: {
          id: data.id,
          name: data.name,
          username: data.username,
          role: data.role,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    throw { response: { status: 404, data: { message: `Route POST /${path} not found` } } };
  },

  async put(url: string, bodyData: any = {}, _config?: any): Promise<any> {
    const { path } = parseUrl(url);

    // 1. Edit Category: /categories/:id
    if (path.startsWith('categories/')) {
      const id = Number(path.split('/')[1]);
      const { name, icon } = bodyData;

      const { data, error } = await supabase
        .from('categories')
        .update({
          name: String(name).trim(),
          icon: icon || 'Tag',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Kategori berhasil diperbarui.',
        data: {
          id: data.id,
          name: data.name,
          icon: data.icon,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    // 2. Edit Product: /products/:id
    if (path.startsWith('products/')) {
      const id = Number(path.split('/')[1]);
      const { name, categoryId, buyPrice, sellPrice, imageUrl, icon, sku, status } = bodyData;

      const updatePayload: any = {
        name: String(name).trim(),
        category_id: Number(categoryId),
        sell_price: Number(sellPrice),
        updated_at: new Date().toISOString(),
      };

      if (buyPrice !== undefined) {
        updatePayload.buy_price = buyPrice !== '' && buyPrice !== null ? Number(buyPrice) : null;
      }
      if (imageUrl !== undefined) updatePayload.image_url = imageUrl || null;
      if (icon !== undefined) updatePayload.icon = icon || null;
      if (sku !== undefined) updatePayload.sku = sku ? String(sku).trim() : null;
      if (status !== undefined) updatePayload.status = status;

      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select('*, categories(id, name)')
        .single();

      if (error) throw { response: { data: { message: error.message } } };

      const buy = data.buy_price !== null ? Number(data.buy_price) : null;
      const sell = Number(data.sell_price);
      return wrapResponse({
        success: true,
        message: 'Produk berhasil diperbarui.',
        data: {
          id: data.id,
          name: data.name,
          categoryId: data.category_id,
          categoryName: data.categories?.name || 'Tanpa Kategori',
          buyPrice: buy,
          sellPrice: sell,
          profit: buy !== null ? sell - buy : null,
          imageUrl: data.image_url,
          icon: data.icon,
          sku: data.sku,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    // 3. Edit User: /users/:id
    if (path.startsWith('users/')) {
      const id = Number(path.split('/')[1]);
      const { name, username, password, role, status } = bodyData;

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (name) updatePayload.name = String(name).trim();
      if (username) updatePayload.username = String(username).trim();
      if (role) updatePayload.role = role;
      if (status) updatePayload.status = status;
      if (password && String(password).trim() !== '') {
        updatePayload.password_hash = bcrypt.hashSync(String(password).trim(), 10);
      }

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select('id, name, username, role, status, created_at, updated_at')
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Pengguna berhasil diperbarui.',
        data: {
          id: data.id,
          name: data.name,
          username: data.username,
          role: data.role,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    // 4. Edit Settings: /settings/:key
    if (path.startsWith('settings/')) {
      const key = path.split('/')[1];
      const value = bodyData.value || bodyData;

      const { data, error } = await supabase
        .from('settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Pengaturan berhasil disimpan.',
        data,
      });
    }

    throw { response: { status: 404, data: { message: `Route PUT /${path} not found` } } };
  },

  async patch(url: string, bodyData: any = {}, _config?: any): Promise<any> {
    const { path } = parseUrl(url);

    // 1. Toggle Product Status: /products/:id/status
    if (path.startsWith('products/') && path.endsWith('/status')) {
      const parts = path.split('/');
      const id = Number(parts[1]);
      const { status } = bodyData;

      const { data, error } = await supabase
        .from('products')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Status produk berhasil diubah.',
        data,
      });
    }

    // 2. Toggle User Status: /users/:id/status
    if (path.startsWith('users/') && path.endsWith('/status')) {
      const parts = path.split('/');
      const id = Number(parts[1]);
      const { status } = bodyData;

      const { data, error } = await supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Status pengguna berhasil diubah.',
        data,
      });
    }

    // 3. Reset User Password: /users/:id/reset-password or /users/:id/password
    if (path.startsWith('users/') && (path.endsWith('/reset-password') || path.endsWith('/password'))) {
      const parts = path.split('/');
      const id = Number(parts[1]);
      const pass = bodyData.newPassword || bodyData.password;

      if (!pass) {
        throw { response: { status: 400, data: { message: 'Password baru wajib diisi.' } } };
      }

      const password_hash = bcrypt.hashSync(String(pass).trim(), 10);
      const { data, error } = await supabase
        .from('users')
        .update({ password_hash, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Password berhasil direset.',
        data,
      });
    }

    // 4. Cancel Transaction: /transactions/:id/cancel
    if (path.startsWith('transactions/') && path.endsWith('/cancel')) {
      const parts = path.split('/');
      const id = Number(parts[1]);

      const { data, error } = await supabase
        .from('transactions')
        .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({
        success: true,
        message: 'Transaksi berhasil dibatalkan.',
        data,
      });
    }

    return this.put(url, bodyData, _config);
  },

  async delete(url: string, _config?: any): Promise<any> {
    const { path } = parseUrl(url);

    // 1. Delete Category: /categories/:id
    if (path.startsWith('categories/')) {
      const id = Number(path.split('/')[1]);
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({ success: true, message: 'Kategori berhasil dihapus.' });
    }

    // 2. Delete Product: /products/:id
    if (path.startsWith('products/')) {
      const id = Number(path.split('/')[1]);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({ success: true, message: 'Produk berhasil dihapus.' });
    }

    // 3. Clear All Transactions: /transactions/clear-all
    if (path === 'transactions/clear-all') {
      const { error: errItems } = await supabase.from('transaction_items').delete().gte('id', 0);
      if (errItems) console.error('Error clearing transaction items:', errItems);

      const { error: errTx } = await supabase.from('transactions').delete().gte('id', 0);
      if (errTx) throw { response: { data: { message: errTx.message } } };

      return wrapResponse({ success: true, message: 'Seluruh riwayat transaksi berhasil dibersihkan.' });
    }

    // 4. Delete Single Transaction: /transactions/:id
    if (path.startsWith('transactions/')) {
      const id = Number(path.split('/')[1]);
      const { error: errItems } = await supabase.from('transaction_items').delete().eq('transaction_id', id);
      if (errItems) console.error('Error deleting transaction items:', errItems);

      const { error: errTx } = await supabase.from('transactions').delete().eq('id', id);
      if (errTx) throw { response: { data: { message: errTx.message } } };

      return wrapResponse({ success: true, message: 'Transaksi berhasil dihapus.' });
    }

    // 5. Delete User: /users/:id
    if (path.startsWith('users/')) {
      const id = Number(path.split('/')[1]);
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw { response: { data: { message: error.message } } };
      return wrapResponse({ success: true, message: 'Pengguna berhasil dihapus.' });
    }

    throw { response: { status: 404, data: { message: `Route DELETE /${path} not found` } } };
  },
};

export default api;
