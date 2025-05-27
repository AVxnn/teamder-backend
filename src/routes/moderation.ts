import { Router, Request, Response, NextFunction } from 'express';
import User, { UserRole, ModerationStatus } from '../models/User';
import notificationService from '../services/notificationService';

const router = Router();

// Middleware для проверки прав администратора
const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log("req", req.body)
  const { telegramId } = req.body
  
  if (!telegramId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await User.findOne({ telegramId });
  
  if (!user || user.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
};

// Получить все карточки на модерацию
router.post('/pending', isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const pendingProfiles = await User.find({
      'profile.moderationStatus': ModerationStatus.PENDING
    }).select('telegramId username firstName profile');
    console.log(pendingProfiles)
    res.json({ success: true, profiles: pendingProfiles });
  } catch (error) {
    console.error('❌ Error fetching pending profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Модерировать карточку
router.post('/moderate', isAdmin, async (req: Request, res: Response): Promise<void> => {
  const { targetTelegramId, status, comment } = req.body;
  const { telegramId: moderatorId } = req.body; // ID модератора

  if (!targetTelegramId || !status || !Object.values(ModerationStatus).includes(status)) {
    res.status(400).json({ error: 'Invalid request parameters' });
    return;
  }

  try {
    const user = await User.findOne({ telegramId: targetTelegramId });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const moderator = await User.findOne({ telegramId: moderatorId });
    if (!moderator) {
      res.status(404).json({ error: 'Moderator not found' });
      return;
    }

    // Инициализируем профиль, если его нет
    if (!user.profile) {
      user.profile = {
        moderationStatus: ModerationStatus.PENDING,
        moderationComment: '',
        moderatedAt: null,
        moderatedBy: null
      };
    }

    // Обновляем статус модерации
    user.profile.moderationStatus = status;
    user.profile.moderationComment = comment;
    user.profile.moderatedAt = new Date();
    user.profile.moderatedBy = moderator._id;

    await user.save();

    // Отправляем уведомление о результате модерации
    if (status === ModerationStatus.APPROVED) {
      await notificationService.notifyProfileApproved(user.telegramId);
    } else if (status === ModerationStatus.REJECTED) {
      await notificationService.notifyProfileRejected(user.telegramId, comment || '');
    }

    res.json({ 
      success: true, 
      message: `Profile ${status}`,
      profile: user.profile 
    });
  } catch (error) {
    console.error('❌ Error moderating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 