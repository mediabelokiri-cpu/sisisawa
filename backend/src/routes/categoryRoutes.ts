import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Both ADMIN and KASIR can view categories
router.get('/', authenticateToken, getCategories);

// Only ADMIN can create, edit, or delete categories
router.post('/', authenticateToken, requireRole(['ADMIN']), createCategory);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateCategory);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteCategory);

export default router;
