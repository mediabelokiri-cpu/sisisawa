import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/categories - List all categories with product count & optional search
export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        c.id, 
        c.name, 
        c.icon,
        c.created_at,
        c.updated_at,
        COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
    `;
    const params: any[] = [];

    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim()}%`);
      query += ` WHERE c.name ILIKE $1`;
    }

    query += ` GROUP BY c.id, c.name, c.icon ORDER BY c.name ASC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data kategori.' });
  }
}

// POST /api/categories - Create new category
export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, icon } = req.body;

    if (!name || String(name).trim() === '') {
      res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      return;
    }

    const trimmedName = String(name).trim();
    const trimmedIcon = icon ? String(icon).trim() : null;

    // Check uniqueness
    const checkRes = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [trimmedName]);
    if (checkRes.rows.length > 0) {
      res.status(400).json({ success: false, message: `Kategori "${trimmedName}" sudah ada.` });
      return;
    }

    const insertRes = await db.query(
      'INSERT INTO categories (name, icon) VALUES ($1, $2) RETURNING id, name, icon, created_at, updated_at',
      [trimmedName, trimmedIcon]
    );

    res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan.',
      data: {
        ...insertRes.rows[0],
        product_count: 0
      }
    });
  } catch (error) {
    console.error('createCategory error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan kategori.' });
  }
}

// PUT /api/categories/:id - Update category
export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;

    if (!name || String(name).trim() === '') {
      res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      return;
    }

    const trimmedName = String(name).trim();
    const trimmedIcon = icon !== undefined ? (icon ? String(icon).trim() : null) : undefined;

    // Check existence
    const existRes = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
      return;
    }

    // Check uniqueness excluding current ID
    const checkRes = await db.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, id]
    );
    if (checkRes.rows.length > 0) {
      res.status(400).json({ success: false, message: `Kategori "${trimmedName}" sudah digunakan.` });
      return;
    }

    let updateRes;
    if (trimmedIcon !== undefined) {
      updateRes = await db.query(
        'UPDATE categories SET name = $1, icon = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, icon, updated_at',
        [trimmedName, trimmedIcon, id]
      );
    } else {
      updateRes = await db.query(
        'UPDATE categories SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, icon, updated_at',
        [trimmedName, id]
      );
    }

    res.json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      data: updateRes.rows[0]
    });
  } catch (error) {
    console.error('updateCategory error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui kategori.' });
  }
}

// DELETE /api/categories/:id - Delete category with strict usage check
export async function deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // 1. Check if category exists
    const existRes = await db.query('SELECT id, name FROM categories WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
      return;
    }

    const catName = existRes.rows[0].name;

    // 2. Check if still used by products
    const productCountRes = await db.query('SELECT COUNT(id)::int as count FROM products WHERE category_id = $1', [id]);
    const productCount = Number(productCountRes.rows[0]?.count || 0);

    if (productCount > 0) {
      res.status(400).json({
        success: false,
        message: `Kategori "${catName}" tidak boleh dihapus karena masih digunakan oleh ${productCount} produk. Silakan pindahkan produk tersebut ke kategori lain terlebih dahulu.`
      });
      return;
    }

    // 3. Delete category
    await db.query('DELETE FROM categories WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Kategori "${catName}" berhasil dihapus.`
    });
  } catch (error) {
    console.error('deleteCategory error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
}
