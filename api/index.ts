import type { Request, Response } from 'express';
import rawApp from '../backend/dist/app.js';
import { initDatabase } from '../backend/dist/config/db.js';

const app: any = (rawApp as any).default || rawApp;

export default async function handler(req: Request, res: Response) {
  try {
    await initDatabase();
  } catch (err) {
    console.error('Database connection error in serverless handler:', err);
  }
  return app(req, res);
}
