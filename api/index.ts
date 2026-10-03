import type { Request, Response } from 'express';
import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/config/db.js';

let isDbInitialized = false;

export default async function handler(req: Request, res: Response) {
  if (!isDbInitialized) {
    try {
      await initDatabase();
      isDbInitialized = true;
    } catch (err) {
      console.error('Failed to initialize database on Vercel serverless startup:', err);
    }
  }
  return app(req, res);
}
