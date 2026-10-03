import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct
} from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Both ADMIN and KASIR can view products
router.get('/', authenticateToken, getProducts);
router.get('/:id', authenticateToken, getProductById);

// Only ADMIN can manage products
router.post('/', authenticateToken, requireRole(['ADMIN']), createProduct);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateProduct);
router.patch('/:id/status', authenticateToken, requireRole(['ADMIN']), toggleProductStatus);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteProduct);

export default router;
