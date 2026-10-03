import pg from 'pg';
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

let dbClient: DBClient | null = null;
let initPromise: Promise<DBClient> | null = null;

export async function initDatabase(): Promise<DBClient> {
  if (dbClient) return dbClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
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
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        });

        await pool.query('SELECT 1');
        console.log('Connected to PostgreSQL Server successfully.');

        const client: DBClient = {
          type: 'pg',
          query: async <T = any>(text: string, params?: any[]) => {
            const res = await pool.query(text, params);
            return { rows: res.rows as T[], rowCount: res.rowCount };
          }
        };
        dbClient = client;
        return client;
      } catch (err) {
        console.warn('PostgreSQL Server connection failed:', err);
      }
    }

    if (!dbClient) {
      try {
        const { PGlite } = await import('@electric-sql/pglite');
        const rootDir = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
        const dataDir = process.env.PGDATA_DIR || path.resolve(rootDir, 'data', 'pgdata');
        if (!fs.existsSync(path.dirname(dataDir))) {
          fs.mkdirSync(path.dirname(dataDir), { recursive: true });
        }

        console.log(`Starting Embedded PostgreSQL Engine (PGlite) at: ${dataDir}`);
        const pgliteInstance = new PGlite(dataDir);
        await pgliteInstance.waitReady;

        const client: DBClient = {
          type: 'pglite',
          query: async <T = any>(text: string, params?: any[]) => {
            const res = await pgliteInstance.query<T>(text, params);
            return {
              rows: (res.rows || []) as T[],
              rowCount: res.rows ? res.rows.length : 0
            };
          }
        };
        dbClient = client;
        console.log('Embedded PostgreSQL Engine ready.');
        return client;
      } catch (pgErr) {
        console.error('Fallback DB connection error:', pgErr);
        throw new Error('Database connection could not be established');
      }
    }

    return dbClient;
  })();

  const client = await initPromise;
  return client;
}

export const db = {
  query: async <T = any>(text: string, params?: any[]) => {
    const client = await initDatabase();
    return client.query<T>(text, params);
  }
};
