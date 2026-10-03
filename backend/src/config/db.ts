import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase PostgreSQL Cloud Database URL with fallback
const SUPABASE_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.xzjijjrtjbnryvsvrflx:Brip%40l007123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
}

interface DBClient {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  type: 'pg';
}

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
    });
  }
  return pool;
}

export async function initDatabase(): Promise<DBClient> {
  const p = getPool();
  return {
    type: 'pg',
    query: async <T = any>(text: string, params?: any[]) => {
      const res = await p.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount };
    },
  };
}

export const db = {
  query: async <T = any>(text: string, params?: any[]) => {
    const p = getPool();
    const res = await p.query(text, params);
    return { rows: res.rows as T[], rowCount: res.rowCount };
  },
};
