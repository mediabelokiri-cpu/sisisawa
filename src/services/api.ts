import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// Helper to simulate Axios response shape: { data: ... }
const wrapResponse = <T>(data: T) => ({ data });

// Helper to parse path and query parameters
function parseUrl(url: string) {
  const [pathname, queryString] = url.split('?');
  const query: Record<string, string> = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    params.forEach((v, k) => {
      query[k] = v;
    });
  }
  // Strip leading /api or /
  const cleanPath = pathname.replace(/^\/api/, '').replace(/^\//, '');
  return { path: cleanPath, query };
}

export const api = {
  // Mock interceptors to prevent errors in existing code
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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw { response: { data: { message: error.message } } };

      const formatted = (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        productCount: 0, // Computed dynamically
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      // Count products per category
      const { data: prods } = await supabase.from('products').select('category_id');
      if (prods) {
        const counts: Record<number, number> = {};
        prods.forEach((p) => {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        });
        formatted.forEach((c) => {
          c.productCount = counts[c.id] || 0;
        });
      }

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

    // 5. Transactions List
    if (path === 'transactions') {
      let queryBuilder = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });

      if (query.start_date) {
        queryBuilder = queryBuilder.gte('created_at', `${query.start_date}T00:00:00Z`);
      }
      if (query.end_date) {
        queryBuilder = queryBuilder.lte('created_at', `${query.end_date}T23:59:59Z`);
      }
      if (query.payment_method && query.payment_method !== 'all') {
        queryBuilder = queryBuilder.eq('payment_method', query.payment_method);
      }
      if (query.cashier_id && query.cashier_id !== 'all') {
        queryBuilder = queryBuilder.eq('cashier_id', Number(query.cashier_id));
      }
      if (query.invoice) {
        queryBuilder = queryBuilder.ilike('invoice_number', `%${query.invoice}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) throw { response: { data: { message: error.message } } };

      const formatted = (data || []).map((t: any) => ({
        id: t.id,
        invoiceNumber: t.invoice_number,
        cashierId: t.cashier_id,
        cashierName: t.cashier_name,
        subtotal: Number(t.subtotal),
        discount: Number(t.discount),
        tax: Number(t.tax),
        totalAmount: Number(t.total_amount),
        cashAmount: t.cash_amount !== null ? Number(t.cash_amount) : null,
        changeAmount: t.change_amount !== null ? Number(t.change_amount) : null,
        paymentMethod: t.payment_method,
        notes: t.notes,
        createdAt: t.created_at,
        items: (t.transaction_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          categoryName: item.category_name,
          buyPrice: item.buy_price !== null ? Number(item.buy_price) : null,
          sellPrice: Number(item.sell_price),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
        })),
      }));

      return wrapResponse({ success: true, data: formatted });
    }

    // 6. Single Transaction Detail: /transactions/:id
    if (path.startsWith('transactions/')) {
      const id = Number(path.split('/')[1]);
      const { data: t, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .eq('id', id)
        .single();

      if (error || !t) throw { response: { data: { message: 'Transaksi tidak ditemukan.' } } };

      return wrapResponse({
        success: true,
        data: {
          id: t.id,
          invoiceNumber: t.invoice_number,
          cashierId: t.cashier_id,
          cashierName: t.cashier_name,
          subtotal: Number(t.subtotal),
          discount: Number(t.discount),
          tax: Number(t.tax),
          totalAmount: Number(t.total_amount),
          cashAmount: t.cash_amount !== null ? Number(t.cash_amount) : null,
          changeAmount: t.change_amount !== null ? Number(t.change_amount) : null,
          paymentMethod: t.payment_method,
          notes: t.notes,
          createdAt: t.created_at,
          items: (t.transaction_items || []).map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            categoryName: item.category_name,
            buyPrice: item.buy_price !== null ? Number(item.buy_price) : null,
            sellPrice: Number(item.sell_price),
            quantity: Number(item.quantity),
            subtotal: Number(item.subtotal),
          })),
        },
      });
    }

    // 7. Dashboard Stats: /dashboard/stats
    if (path === 'dashboard/stats') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data: txs } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });

      const { data: allProducts } = await supabase.from('products').select('*');

      const allTxs = txs || [];
      const todayTxs = allTxs.filter((t) => t.created_at >= startOfDay);

      const totalRevenueToday = todayTxs.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const totalTransactionsToday = todayTxs.length;

      // Calculate total profit today
      let totalProfitToday = 0;
      todayTxs.forEach((t) => {
        (t.transaction_items || []).forEach((item: any) => {
          const buy = item.buy_price !== null ? Number(item.buy_price) : 0;
          const sell = Number(item.sell_price);
          const qty = Number(item.quantity);
          totalProfitToday += (sell - buy) * qty;
        });
      });

      // Recent transactions (last 5)
      const recentTransactions = allTxs.slice(0, 5).map((t) => ({
        id: t.id,
        invoiceNumber: t.invoice_number,
        cashierName: t.cashier_name,
        totalAmount: Number(t.total_amount),
        paymentMethod: t.payment_method,
        createdAt: t.created_at,
      }));

      // Top products sold
      const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
      allTxs.forEach((t) => {
        (t.transaction_items || []).forEach((item: any) => {
          const key = item.product_name;
          if (!productSalesMap[key]) {
            productSalesMap[key] = { name: key, quantity: 0, revenue: 0 };
          }
          productSalesMap[key].quantity += Number(item.quantity);
          productSalesMap[key].revenue += Number(item.subtotal);
        });
      });

      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Hourly sales today
      const hourlyMap: Record<string, number> = {};
      for (let i = 0; i < 24; i++) {
        const hourLabel = `${String(i).padStart(2, '0')}:00`;
        hourlyMap[hourLabel] = 0;
      }
      todayTxs.forEach((t) => {
        const date = new Date(t.created_at);
        const hourLabel = `${String(date.getHours()).padStart(2, '0')}:00`;
        hourlyMap[hourLabel] = (hourlyMap[hourLabel] || 0) + Number(t.total_amount);
      });
      const hourlySales = Object.entries(hourlyMap).map(([hour, revenue]) => ({ hour, revenue }));

      // Payment methods breakdown
      const paymentBreakdownMap: Record<string, number> = {};
      allTxs.forEach((t) => {
        paymentBreakdownMap[t.payment_method] = (paymentBreakdownMap[t.payment_method] || 0) + 1;
      });
      const paymentBreakdown = Object.entries(paymentBreakdownMap).map(([method, count]) => ({
        method,
        count,
      }));

      return wrapResponse({
        success: true,
        data: {
          today: {
            revenue: totalRevenueToday,
            transactions: totalTransactionsToday,
            profit: totalProfitToday,
            totalProducts: (allProducts || []).length,
          },
          recentTransactions,
          topProducts,
          hourlySales,
          paymentBreakdown,
        },
      });
    }

    // 8. Monthly Report: /reports/monthly
    if (path === 'reports/monthly') {
      const year = Number(query.year) || new Date().getFullYear();
      const month = Number(query.month) || new Date().getMonth() + 1;

      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const { data: txs, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (error) throw { response: { data: { message: error.message } } };

      const allTxs = txs || [];
      const totalRevenue = allTxs.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const totalTransactions = allTxs.length;

      let totalProfit = 0;
      let totalItemsSold = 0;
      const dailyMap: Record<string, { date: string; revenue: number; transactions: number; profit: number }> = {};

      allTxs.forEach((t) => {
        const dateKey = t.created_at.split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, revenue: 0, transactions: 0, profit: 0 };
        }
        dailyMap[dateKey].revenue += Number(t.total_amount);
        dailyMap[dateKey].transactions += 1;

        (t.transaction_items || []).forEach((item: any) => {
          const buy = item.buy_price !== null ? Number(item.buy_price) : 0;
          const sell = Number(item.sell_price);
          const qty = Number(item.quantity);
          const profitItem = (sell - buy) * qty;
          totalProfit += profitItem;
          totalItemsSold += qty;
          dailyMap[dateKey].profit += profitItem;
        });
      });

      return wrapResponse({
        success: true,
        data: {
          summary: {
            year,
            month,
            totalRevenue,
            totalTransactions,
            totalProfit,
            totalItemsSold,
          },
          dailyReports: Object.values(dailyMap),
        },
      });
    }

    // 9. Users / Kasir List: /users
    if (path === 'users') {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, role, status, created_at, updated_at')
        .order('id', { ascending: true });

      if (error) throw { response: { data: { message: error.message } } };

      const formatted = (data || []).map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      return wrapResponse({ success: true, data: formatted });
    }

    // 10. Settings List: /settings
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
      const { name, description, icon } = bodyData;
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
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
          description: data.description,
          icon: data.icon,
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
        notes,
        items,
      } = bodyData;

      const generatedInvoice = invoiceNumber || `INV-${Date.now()}`;

      // Insert transaction header
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          invoice_number: generatedInvoice,
          cashier_id: cashierId ? Number(cashierId) : null,
          cashier_name: cashierName || 'Kasir',
          subtotal: Number(subtotal),
          discount: Number(discount || 0),
          tax: Number(tax || 0),
          total_amount: Number(totalAmount),
          cash_amount: cashAmount !== null && cashAmount !== undefined ? Number(cashAmount) : null,
          change_amount: changeAmount !== null && changeAmount !== undefined ? Number(changeAmount) : null,
          payment_method: paymentMethod || 'CASH',
          notes: notes || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) throw { response: { data: { message: txError.message } } };

      // Insert transaction items
      if (items && items.length > 0) {
        const itemRows = items.map((item: any) => ({
          transaction_id: tx.id,
          product_id: item.productId ? Number(item.productId) : null,
          product_name: item.productName || item.name,
          category_name: item.categoryName || 'Umum',
          buy_price: item.buyPrice !== null && item.buyPrice !== undefined ? Number(item.buyPrice) : null,
          sell_price: Number(item.sellPrice || item.price),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal || Number(item.sellPrice || item.price) * Number(item.quantity)),
        }));

        const { error: itemsError } = await supabase.from('transaction_items').insert(itemRows);
        if (itemsError) console.error('Error inserting transaction items:', itemsError);
      }

      return wrapResponse({
        success: true,
        message: 'Transaksi berhasil disimpan.',
        data: {
          id: tx.id,
          invoiceNumber: tx.invoice_number,
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
      const { name, description, icon } = bodyData;

      const { data, error } = await supabase
        .from('categories')
        .update({
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
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
          description: data.description,
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

    // 3. Reset User Password: /users/:id/password
    if (path.startsWith('users/') && path.endsWith('/password')) {
      const parts = path.split('/');
      const id = Number(parts[1]);
      const { password } = bodyData;

      const password_hash = bcrypt.hashSync(String(password).trim(), 10);
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
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
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

    // Fallback to put
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

    // 3. Delete User: /users/:id
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
