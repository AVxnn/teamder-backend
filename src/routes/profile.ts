// routes/profile.ts
import { Router, Request, Response } from 'express';
import User, { ModerationStatus } from '../models/User';
import notificationService from '../services/notificationService';
import recommendationService from '../services/recommendationService';

const router = Router();

// Middleware для проверки аутентификации
const isAuthenticated = async (req: Request, res: Response, next: Function) => {
  const telegramId = req.body.telegramId;
  
  if (!telegramId) {
    return res.status(401).json({ error: 'telegramId is required' });
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/create', async (req: Request, res: Response): Promise<void> => {
  const {
    telegramId,
    nickname,
    about,
    lookingFor,
    steamId,
    rating,
    hoursPlayed,
    wins,
    losses,
    discordLink,
    steamLink,
    cardImage,
  } = req.body;

  if (!telegramId) {
    res.status(400).json({ error: 'telegramId is required' });
    return;
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.profile = {
      nickname,
      about,
      lookingFor,
      steamId,
      rating,
      hoursPlayed,
      wins,
      losses,
      discordLink,
      steamLink,
      cardImage,
      moderationStatus: ModerationStatus.PENDING,
      moderationComment: '',
      moderatedAt: null,
      moderatedBy: null
    };

    await user.save();

    // Отправляем уведомление о отправке на модерацию
    await notificationService.notifyProfilePending(telegramId);

    res.json({ 
      success: true, 
      message: 'Profile card created and sent for moderation', 
      profile: user.profile 
    });
  } catch (err) {
    console.error('❌ Profile creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удаление карточки пользователя
router.delete('/delete', async (req: Request, res: Response): Promise<void> => {
  const { telegramId } = req.body;

  if (!telegramId) {
    res.status(400).json({ error: 'telegramId is required' });
    return;
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Проверяем, есть ли карточка у пользователя
    if (!user.profile) {
      res.status(400).json({ error: 'User does not have a profile card' });
      return;
    }

    // Вместо удаления карточки, помечаем её как удаленную
    user.profile.moderationStatus = ModerationStatus.DELETED;
    user.profile.moderationComment = 'Карточка удалена пользователем';
    user.profile.moderatedAt = new Date();
    await user.save();

    // Отправляем уведомление об удалении карточки
    await notificationService.notifyProfileDeleted(telegramId);

    res.json({ 
      success: true, 
      message: 'Profile card has been marked as deleted'
    });
  } catch (err) {
    console.error('❌ Profile deletion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение профиля пользователя по telegramId
router.get('/:telegramId', async (req: Request, res: Response) => {
  try {
    const telegramId = Number(req.params.telegramId);
    if (!telegramId) {
      return res.status(400).json({ error: 'Invalid telegramId' });
    }

    const user = await User.findOne({ telegramId })
      .select('telegramId username firstName photoUrl profile role stars')
      .populate('profile.moderatedBy', 'telegramId username firstName');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Получаем информацию о лайках
    const likesInfo = await recommendationService.getLikesInfo(telegramId);

    const response = {
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        role: user.role,
        stars: user.stars,
        profile: user.profile
      },
      likes: likesInfo
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
