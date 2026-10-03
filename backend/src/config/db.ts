import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
}

interface DBClient {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  type: 'pg' | 'pglite';
}

let dbClient: DBClient;

export async function initDatabase(): Promise<DBClient> {
  if (dbClient) return dbClient;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() !== '') {
    try {
      console.log('Connecting to PostgreSQL server via DATABASE_URL...');
      const isCloudPg =
        databaseUrl.includes('supabase') ||
        databaseUrl.includes('pooler.supabase.com') ||
        databaseUrl.includes('neon.tech') ||
        databaseUrl.includes('render.com') ||
        databaseUrl.includes('railway.app') ||
        databaseUrl.includes('sslmode=require');

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: isCloudPg ? { rejectUnauthorized: false } : undefined,
      });

      await pool.query('SELECT 1');
      console.log('Connected to PostgreSQL Server successfully.');

      dbClient = {
        type: 'pg',
        query: async <T = any>(text: string, params?: any[]) => {
          const res = await pool.query(text, params);
          return { rows: res.rows as T[], rowCount: res.rowCount };
        }
      };
    } catch (err) {
      console.warn('PostgreSQL Server connection failed, falling back to embedded PostgreSQL engine (PGlite)...', err);
    }
  }

  if (!dbClient) {
    const rootDir = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const dataDir = process.env.PGDATA_DIR || path.resolve(rootDir, 'data', 'pgdata');
    if (!fs.existsSync(path.dirname(dataDir))) {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    }

    console.log(`Starting Embedded PostgreSQL Engine (PGlite) at: ${dataDir}`);
    let pgliteInstance: PGlite | null = null;

    try {
      pgliteInstance = new PGlite(dataDir);
      await pgliteInstance.waitReady;
    } catch (pgInitErr) {
      console.warn('Existing pgdata had an unclean shutdown, resetting and recovering cleanly...', pgInitErr);
      try {
        if (fs.existsSync(dataDir)) {
          fs.rmSync(dataDir, { recursive: true, force: true });
        }
      } catch (rmErr) {
        console.error('Could not remove dataDir:', rmErr);
      }
      pgliteInstance = new PGlite(dataDir);
      await pgliteInstance.waitReady;
    }

    const activePglite = pgliteInstance;
    dbClient = {
      type: 'pglite',
      query: async <T = any>(text: string, params?: any[]) => {
        const res = await activePglite.query<T>(text, params);
        return {
          rows: (res.rows || []) as T[],
          rowCount: res.rows ? res.rows.length : 0
        };
      }
    };
    console.log('Embedded PostgreSQL Engine ready.');
  }

  await runMigrationsAndSeeds(dbClient);
  return dbClient;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'KASIR')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    buy_price NUMERIC(12, 2) DEFAULT NULL,
    sell_price NUMERIC(12, 2) NOT NULL,
    image_url TEXT DEFAULT NULL,
    icon VARCHAR(50) DEFAULT NULL,
    sku VARCHAR(50) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'UNAVAILABLE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('Cash', 'QRIS', 'Debit', 'Transfer')),
    status VARCHAR(20) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function runMigrationsAndSeeds(client: DBClient) {
  // 1. Run DDL Schema
  const statements = SCHEMA_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (e) {
      console.error('Migration statement error:', stmt, e);
    }
  }

  // 2. Check if default admin exists, if not seed initial data
  const usersCheck = await client.query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(usersCheck.rows[0]?.count || '0', 10);

  if (userCount === 0) {
    console.log('Seeding initial database records...');

    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('ownerilo123', salt);

    // Insert Admin User ownerilo
    await client.query(
      `INSERT INTO users (name, username, password_hash, role, status) VALUES 
       ($1, $2, $3, $4, $5)`,
      [
        'Owner Ilo', 'ownerilo', adminHash, 'ADMIN', 'Active'
      ]
    );

    // Insert Default Store Settings
    const defaultSettings = [
      {
        key: 'store_profile',
        value: {
          name: 'SISISAWA',
          address: 'Jl. Trans Sulawesi, Indonesia',
          phone: '081234567890',
          whatsapp: '081234567890',
          logo: '/logo.png'
        }
      },
      {
        key: 'transaction_config',
        value: {
          invoice_prefix: 'INV-',
          default_discount: 0,
          enable_tax: false,
          tax_percentage: 0,
          rounding: false
        }
      },
      {
        key: 'receipt_config',
        value: {
          header: 'SISISAWA',
          address: 'Jl. Trans Sulawesi, Indonesia',
          footer: 'Terima Kasih Telah Berbelanja di SISISAWA!',
          show_cashier: true,
          show_datetime: true
        }
      },
      {
        key: 'system_config',
        value: {
          language: 'id',
          currency: 'IDR',
          timezone: 'Asia/Makassar'
        }
      }
    ];

    for (const setting of defaultSettings) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [setting.key, JSON.stringify(setting.value)]
      );
    }

    console.log('Database initialized successfully with default users & SISISAWA configuration (clean products & categories).');
  }
}

export const db = {
  query: async <T = any>(text: string, params?: any[]) => {
    if (!dbClient) {
      await initDatabase();
    }
    return dbClient.query<T>(text, params);
  }
};
