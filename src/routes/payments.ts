import express from 'express';
import paymentService from '../services/paymentService';
import User from '../models/User';

const router = express.Router();

// Middleware для проверки аутентификации
const isAuthenticated = async (req: any, res: any, next: any) => {
  const telegramId = req.method === 'GET' ? req.query.telegramId : req.body.telegramId;
  
  if (!telegramId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ telegramId: Number(telegramId) });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Создание инвойса для оплаты
router.post('/create-invoice', isAuthenticated, async (req: any, res: any) => {
  try {
    const { product, amount } = req.body;
    
    if (product !== 'stars') {
      return res.status(400).json({ message: 'Invalid product type' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const invoice = await paymentService.createStarsInvoice(req.user.telegramId, amount);
    res.json({ status: 'success', data: invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Получение истории платежей
router.get('/history', isAuthenticated, async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const payments = await paymentService.getUserPayments(req.user.telegramId, limit);
    res.json({ status: 'success', payments });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 