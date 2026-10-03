import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/users - List users with filters and search
export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { role, status, search } = req.query;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(t.id)::int FROM transactions t WHERE t.user_id = u.id) as transaction_count
      FROM users u
      WHERE 1=1
    `;

    const params: any[] = [];

    if (role && (role === 'ADMIN' || role === 'KASIR')) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (status && (status === 'Active' || status === 'Inactive')) {
      params.push(status);
      query += ` AND u.status = $${params.length}`;
    }

    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim()}%`);
      query += ` AND (u.name ILIKE $${params.length} OR u.username ILIKE $${params.length})`;
    }

    query += ` ORDER BY u.role ASC, u.name ASC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        status: u.status,
        transactionCount: Number(u.transaction_count),
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }))
    });
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar pengguna.' });
  }
}

// GET /api/users/:id - Single user details
export async function getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        u.id,
        u.name,
        u.username,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(t.id)::int FROM transactions t WHERE t.user_id = u.id) as transaction_count
      FROM users u
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const u = result.rows[0];

    res.json({
      success: true,
      data: {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        status: u.status,
        transactionCount: Number(u.transaction_count),
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }
    });
  } catch (error) {
    console.error('getUserById error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat detail pengguna.' });
  }
}

// POST /api/users - Create new user (Role restricted to ADMIN / KASIR)
export async function createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, username, password, role = 'KASIR', status = 'Active' } = req.body;

    if (!name || String(name).trim() === '') {
      res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi.' });
      return;
    }

    if (!username || String(username).trim() === '') {
      res.status(400).json({ success: false, message: 'Username wajib diisi.' });
      return;
    }

    if (!password || String(password).trim().length < 4) {
      res.status(400).json({ success: false, message: 'Password minimal 4 karakter.' });
      return;
    }

    if (!['ADMIN', 'KASIR'].includes(role)) {
      res.status(400).json({ success: false, message: 'Role harus ADMIN atau KASIR.' });
      return;
    }

    const trimmedUsername = String(username).trim().toLowerCase();

    // Check unique username
    const checkRes = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
    if (checkRes.rows.length > 0) {
      res.status(400).json({ success: false, message: `Username "${trimmedUsername}" sudah digunakan.` });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);
    const userStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    const insertRes = await db.query(
      `INSERT INTO users (name, username, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, username, role, status, created_at, updated_at`,
      [String(name).trim(), trimmedUsername, passwordHash, role, userStatus]
    );

    const created = insertRes.rows[0];

    res.status(201).json({
      success: true,
      message: `Pengguna "${created.name}" berhasil ditambahkan.`,
      data: {
        id: created.id,
        name: created.name,
        username: created.username,
        role: created.role,
        status: created.status,
        transactionCount: 0,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      }
    });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan pengguna baru.' });
  }
}

// PUT /api/users/:id - Update user details
export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, username, role, status } = req.body;

    const existRes = await db.query('SELECT id, role, status FROM users WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    // Protection: do not allow admin to demote or deactivate their own currently active session
    if (req.user && req.user.id === Number(id)) {
      if (role && role !== 'ADMIN') {
        res.status(400).json({ success: false, message: 'Anda tidak dapat mengubah role akun Anda sendiri.' });
        return;
      }
      if (status && status === 'Inactive') {
        res.status(400).json({ success: false, message: 'Anda tidak dapat menonaktifkan akun Anda sendiri saat sedang login.' });
        return;
      }
    }

    if (!name || String(name).trim() === '') {
      res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi.' });
      return;
    }

    if (!username || String(username).trim() === '') {
      res.status(400).json({ success: false, message: 'Username wajib diisi.' });
      return;
    }

    if (role && !['ADMIN', 'KASIR'].includes(role)) {
      res.status(400).json({ success: false, message: 'Role harus ADMIN atau KASIR.' });
      return;
    }

    const trimmedUsername = String(username).trim().toLowerCase();

    // Check unique username excluding current
    const checkRes = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
      [trimmedUsername, id]
    );
    if (checkRes.rows.length > 0) {
      res.status(400).json({ success: false, message: `Username "${trimmedUsername}" sudah digunakan oleh pengguna lain.` });
      return;
    }

    const userRole = role || existRes.rows[0].role;
    const userStatus = status || existRes.rows[0].status;

    const updateRes = await db.query(
      `UPDATE users 
       SET name = $1, username = $2, role = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, username, role, status, updated_at`,
      [String(name).trim(), trimmedUsername, userRole, userStatus, id]
    );

    const updated = updateRes.rows[0];

    res.json({
      success: true,
      message: `Data pengguna "${updated.name}" berhasil diperbarui.`,
      data: updated
    });
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui data pengguna.' });
  }
}

// PATCH /api/users/:id/status - Toggle Active / Inactive
export async function toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existRes = await db.query('SELECT id, name, status FROM users WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    // Protection: do not allow self-deactivation
    if (req.user && req.user.id === Number(id)) {
      res.status(400).json({ success: false, message: 'Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan.' });
      return;
    }

    let newStatus = status;
    if (!newStatus) {
      newStatus = existRes.rows[0].status === 'Active' ? 'Inactive' : 'Active';
    } else if (!['Active', 'Inactive'].includes(newStatus)) {
      res.status(400).json({ success: false, message: 'Status harus Active atau Inactive.' });
      return;
    }

    await db.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Status akun "${existRes.rows[0].name}" diubah menjadi ${newStatus}.`,
      data: { id: Number(id), status: newStatus }
    });
  } catch (error) {
    console.error('toggleUserStatus error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengubah status pengguna.' });
  }
}

// PATCH /api/users/:id/reset-password - Reset password
export async function resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).trim().length < 4) {
      res.status(400).json({ success: false, message: 'Password baru minimal 4 karakter.' });
      return;
    }

    const existRes = await db.query('SELECT id, name FROM users WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);

    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );

    res.json({
      success: true,
      message: `Password untuk akun "${existRes.rows[0].name}" berhasil di-reset.`
    });
  } catch (error) {
    console.error('resetUserPassword error:', error);
    res.status(500).json({ success: false, message: 'Gagal me-reset password pengguna.' });
  }
}

// DELETE /api/users/:id - Delete user with transaction history check
export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === Number(id)) {
      res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
      return;
    }

    const existRes = await db.query('SELECT id, name FROM users WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const userName = existRes.rows[0].name;

    // Check transaction history
    const txCountRes = await db.query('SELECT COUNT(id)::int as count FROM transactions WHERE user_id = $1', [id]);
    const txCount = Number(txCountRes.rows[0]?.count || 0);

    if (txCount > 0) {
      res.status(400).json({
        success: false,
        message: `Pengguna "${userName}" memiliki riwayat ${txCount} transaksi penjualan. Sesuai aturan sistem, akun ini sebaiknya dinonaktifkan (Inactive) daripada dihapus agar histori nota penjualan tetap utuh.`
      });
      return;
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Pengguna "${userName}" berhasil dihapus.`
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus pengguna.' });
  }
}
