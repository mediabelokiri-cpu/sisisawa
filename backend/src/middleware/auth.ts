import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'KASIR';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'kasirku_super_secure_jwt_secret_key_2026_umkm';

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Akses ditolak. Token otentikasi tidak ditemukan.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Sesi telah kedaluwarsa atau token tidak valid. Silakan login kembali.' });
    return;
  }
}

export function requireRole(allowedRoles: ('ADMIN' | 'KASIR')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Otentikasi diperlukan.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Akses dilarang. Anda tidak memiliki hak akses untuk halaman ini.'
      });
      return;
    }

    next();
  };
}
