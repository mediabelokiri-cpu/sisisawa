import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/products - List products with category, status, and search filters
export async function getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { category_id, status, search } = req.query;

    let query = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        p.buy_price,
        p.sell_price,
        p.image_url,
        p.icon,
        p.sku,
        p.status,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (category_id && String(category_id) !== 'all' && !isNaN(Number(category_id))) {
      params.push(Number(category_id));
      query += ` AND p.category_id = $${params.length}`;
    }

    if (status && (status === 'AVAILABLE' || status === 'UNAVAILABLE')) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim()}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }

    query += ` ORDER BY p.created_at DESC, p.name ASC`;

    const result = await db.query(query, params);

    // Format products and calculate profit
    const products = result.rows.map((p) => {
      const buyPrice = p.buy_price !== null ? Number(p.buy_price) : null;
      const sellPrice = Number(p.sell_price);
      const profit = buyPrice !== null ? sellPrice - buyPrice : null;

      return {
        id: p.id,
        name: p.name,
        categoryId: p.category_id,
        categoryName: p.category_name,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        profit: profit,
        imageUrl: p.image_url,
        icon: p.icon,
        sku: p.sku,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      };
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat data produk.' });
  }
}

// GET /api/products/:id - Single product detail
export async function getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        p.buy_price,
        p.sell_price,
        p.image_url,
        p.icon,
        p.sku,
        p.status,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    const p = result.rows[0];
    const buyPrice = p.buy_price !== null ? Number(p.buy_price) : null;
    const sellPrice = Number(p.sell_price);
    const profit = buyPrice !== null ? sellPrice - buyPrice : null;

    res.json({
      success: true,
      data: {
        id: p.id,
        name: p.name,
        categoryId: p.category_id,
        categoryName: p.category_name,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        profit: profit,
        imageUrl: p.image_url,
        icon: p.icon,
        sku: p.sku,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    });
  } catch (error) {
    console.error('getProductById error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail produk.' });
  }
}

// POST /api/products - Create new product
export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, categoryId, buyPrice, sellPrice, imageUrl, icon, sku, status = 'AVAILABLE' } = req.body;

    if (!name || String(name).trim() === '') {
      res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' });
      return;
    }

    if (!categoryId || isNaN(Number(categoryId))) {
      res.status(400).json({ success: false, message: 'Kategori produk wajib dipilih.' });
      return;
    }

    if (sellPrice === undefined || isNaN(Number(sellPrice)) || Number(sellPrice) < 0) {
      res.status(400).json({ success: false, message: 'Harga jual wajib diisi dan harus valid.' });
      return;
    }

    const prodStatus = status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    const parsedBuyPrice = buyPrice !== undefined && buyPrice !== '' && buyPrice !== null && !isNaN(Number(buyPrice))
      ? Number(buyPrice)
      : null;

    // Verify category exists
    const catRes = await db.query('SELECT id, name FROM categories WHERE id = $1', [Number(categoryId)]);
    if (catRes.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Kategori yang dipilih tidak valid.' });
      return;
    }

    const insertRes = await db.query(
      `INSERT INTO products (name, category_id, buy_price, sell_price, image_url, icon, sku, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, category_id, buy_price, sell_price, image_url, icon, sku, status, created_at, updated_at`,
      [
        String(name).trim(),
        Number(categoryId),
        parsedBuyPrice,
        Number(sellPrice),
        imageUrl ? String(imageUrl).trim() : null,
        icon ? String(icon).trim() : null,
        sku ? String(sku).trim() : null,
        prodStatus
      ]
    );

    const created = insertRes.rows[0];
    const finalBuy = created.buy_price !== null ? Number(created.buy_price) : null;
    const finalSell = Number(created.sell_price);

    res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan.',
      data: {
        id: created.id,
        name: created.name,
        categoryId: created.category_id,
        categoryName: catRes.rows[0].name,
        buyPrice: finalBuy,
        sellPrice: finalSell,
        profit: finalBuy !== null ? finalSell - finalBuy : null,
        imageUrl: created.image_url,
        icon: created.icon,
        sku: created.sku,
        status: created.status,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      }
    });
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan produk.' });
  }
}

// PUT /api/products/:id - Update product
export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, categoryId, buyPrice, sellPrice, imageUrl, icon, sku, status } = req.body;

    // Check existence
    const existRes = await db.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    if (!name || String(name).trim() === '') {
      res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' });
      return;
    }

    if (!categoryId || isNaN(Number(categoryId))) {
      res.status(400).json({ success: false, message: 'Kategori produk wajib dipilih.' });
      return;
    }

    if (sellPrice === undefined || isNaN(Number(sellPrice)) || Number(sellPrice) < 0) {
      res.status(400).json({ success: false, message: 'Harga jual wajib diisi dan harus valid.' });
      return;
    }

    // Verify category exists
    const catRes = await db.query('SELECT id, name FROM categories WHERE id = $1', [Number(categoryId)]);
    if (catRes.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Kategori tidak valid.' });
      return;
    }

    const prodStatus = status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    const parsedBuyPrice = buyPrice !== undefined && buyPrice !== '' && buyPrice !== null && !isNaN(Number(buyPrice))
      ? Number(buyPrice)
      : null;

    const updateRes = await db.query(
      `UPDATE products 
       SET name = $1, 
           category_id = $2, 
           buy_price = $3, 
           sell_price = $4, 
           image_url = $5, 
           icon = $6,
           sku = $7, 
           status = $8, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, name, category_id, buy_price, sell_price, image_url, icon, sku, status, updated_at`,
      [
        String(name).trim(),
        Number(categoryId),
        parsedBuyPrice,
        Number(sellPrice),
        imageUrl ? String(imageUrl).trim() : null,
        icon ? String(icon).trim() : null,
        sku ? String(sku).trim() : null,
        prodStatus,
        id
      ]
    );

    const updated = updateRes.rows[0];
    const finalBuy = updated.buy_price !== null ? Number(updated.buy_price) : null;
    const finalSell = Number(updated.sell_price);

    res.json({
      success: true,
      message: 'Produk berhasil diperbarui.',
      data: {
        id: updated.id,
        name: updated.name,
        categoryId: updated.category_id,
        categoryName: catRes.rows[0].name,
        buyPrice: finalBuy,
        sellPrice: finalSell,
        profit: finalBuy !== null ? finalSell - finalBuy : null,
        imageUrl: updated.image_url,
        icon: updated.icon,
        sku: updated.sku,
        status: updated.status,
        updatedAt: updated.updated_at
      }
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui produk.' });
  }
}

// PATCH /api/products/:id/status - Quick toggle status (AVAILABLE <-> UNAVAILABLE)
export async function toggleProductStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existRes = await db.query('SELECT id, status, name FROM products WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    let newStatus = status;
    if (!newStatus) {
      newStatus = existRes.rows[0].status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    } else if (newStatus !== 'AVAILABLE' && newStatus !== 'UNAVAILABLE') {
      res.status(400).json({ success: false, message: 'Status harus AVAILABLE atau UNAVAILABLE.' });
      return;
    }

    await db.query(
      'UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Status produk "${existRes.rows[0].name}" diubah menjadi ${newStatus}.`,
      data: { id: Number(id), status: newStatus }
    });
  } catch (error) {
    console.error('toggleProductStatus error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengubah status produk.' });
  }
}

// DELETE /api/products/:id - Delete product
export async function deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existRes = await db.query('SELECT id, name FROM products WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    const prodName = existRes.rows[0].name;

    // Check if product is referenced in transaction items
    const txCountRes = await db.query('SELECT COUNT(id)::int as count FROM transaction_items WHERE product_id = $1', [id]);
    const txCount = Number(txCountRes.rows[0]?.count || 0);

    if (txCount > 0) {
      res.status(400).json({
        success: false,
        message: `Produk "${prodName}" sudah tercatat pada ${txCount} riwayat transaksi. Disarankan mengubah status menjadi UNAVAILABLE agar laporan dan histori transaksi tetap utuh.`
      });
      return;
    }

    await db.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Produk "${prodName}" berhasil dihapus.`
    });
  } catch (error: any) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus produk.' });
  }
}
