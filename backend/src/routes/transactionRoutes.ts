import { Router } from 'express';
import {
  getTransactions,
  getCashiersForFilter,
  getTransactionById,
  cancelTransaction,
  createTransaction,
  deleteTransaction,
  clearAllTransactions
} from '../controllers/transactionController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Both ADMIN and KASIR can view transactions or cashiers
router.get('/', authenticateToken, getTransactions);
router.get('/cashiers', authenticateToken, getCashiersForFilter);
router.get('/:id', authenticateToken, getTransactionById);

// Create transaction (Kasir and Admin)
router.post('/', authenticateToken, createTransaction);

// Only ADMIN can cancel a transaction
router.patch('/:id/cancel', authenticateToken, requireRole(['ADMIN']), cancelTransaction);

// Only ADMIN can clear all transactions
router.delete('/clear-all', authenticateToken, requireRole(['ADMIN']), clearAllTransactions);

// Only ADMIN can delete a specific transaction
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteTransaction);

export default router;
