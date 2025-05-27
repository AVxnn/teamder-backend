import express from 'express';
import notificationService from '../services/notificationService';
import User from '../models/User';

const router = express.Router();

// Middleware для проверки аутентификации
const isAuthenticated = async (req: any, res: any, next: any) => {
  // Получаем telegramId из query параметров для GET запросов или из тела для POST
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

// Получение уведомлений пользователя
router.get('/', isAuthenticated, async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await notificationService.getUserNotifications(req.user.telegramId, limit);
    res.json({ status: "success", notifications });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Отметка уведомления как прочитанного
router.post('/:notificationId/read', isAuthenticated, async (req: any, res: any) => {
  try {
    const notification = await notificationService.markAsRead(req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Отметка всех уведомлений как прочитанных
router.post('/read-all', isAuthenticated, async (req: any, res: any) => {
  try {
    await notificationService.markAllAsRead(req.user.telegramId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 