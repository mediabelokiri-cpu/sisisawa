import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kasirku_super_secure_jwt_secret_key_2026_umkm';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
      return;
    }

    const trimmedUsername = String(username).trim();
    const result = await db.query(
      'SELECT id, name, username, password_hash, role, status FROM users WHERE username = $1',
      [trimmedUsername]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Username atau password salah.' });
      return;
    }

    const user = result.rows[0];

    if (user.status !== 'Active') {
      res.status(403).json({ success: false, message: 'Akun Anda sedang nonaktif. Hubungi Admin.' });
      return;
    }

    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Username atau password salah.' });
      return;
    }

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat login.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terotentikasi.' });
      return;
    }

    const result = await db.query(
      'SELECT id, name, username, role, status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const user = result.rows[0];
    if (user.status !== 'Active') {
      res.status(403).json({ success: false, message: 'Akun Anda nonaktif.' });
      return;
    }

    // Also get store profile settings
    const settingsRes = await db.query("SELECT value FROM settings WHERE key = 'store_profile'");
    const storeProfile = settingsRes.rows[0]?.value || null;

    res.json({
      success: true,
      data: {
        user,
        storeProfile
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data profil.' });
  }
}
