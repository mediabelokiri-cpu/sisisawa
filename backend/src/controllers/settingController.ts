import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/settings - Get all application settings
export async function getAllSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await db.query('SELECT key, value, updated_at FROM settings');

    const settingsMap: Record<string, any> = {
      store_profile: {
        name: 'Toko Berkah Sejahtera',
        address: 'Jl. Ahmad Yani No. 45, Makassar',
        phone: '081234567890',
        whatsapp: '081234567890',
        logo: null
      },
      transaction_config: {
        invoice_prefix: 'INV-',
        default_discount: 0,
        enable_tax: false,
        tax_percentage: 0,
        rounding: false
      },
      receipt_config: {
        header: 'TOKO BERKAH SEJAHTERA',
        address: 'Jl. Ahmad Yani No. 45, Makassar',
        footer: 'Terima Kasih Telah Berbelanja!',
        show_cashier: true,
        show_datetime: true
      },
      system_config: {
        language: 'id',
        currency: 'IDR',
        timezone: 'Asia/Makassar'
      }
    };

    for (const row of result.rows) {
      settingsMap[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    }

    res.json({
      success: true,
      data: settingsMap
    });
  } catch (error) {
    console.error('getAllSettings error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat pengaturan.' });
  }
}

// PUT /api/settings/:key - Update a specific settings section
export async function updateSettingByKey(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const key = String(req.params.key);
    const value = req.body;

    const allowedKeys = ['store_profile', 'transaction_config', 'receipt_config', 'system_config'];
    if (!allowedKeys.includes(key)) {
      res.status(400).json({ success: false, message: `Kunci pengaturan "${key}" tidak valid.` });
      return;
    }

    if (!value || typeof value !== 'object') {
      res.status(400).json({ success: false, message: 'Nilai pengaturan harus berupa objek yang valid.' });
      return;
    }

    // Key specific validations
    if (key === 'store_profile') {
      if (!value.name || String(value.name).trim() === '') {
        res.status(400).json({ success: false, message: 'Nama Toko wajib diisi.' });
        return;
      }
    }

    const valueJson = JSON.stringify(value);

    await db.query(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, valueJson]
    );

    res.json({
      success: true,
      message: 'Pengaturan berhasil disimpan.',
      data: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('updateSettingByKey error:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan.' });
  }
}
