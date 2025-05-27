// routes/profile.ts
import { Router, Request, Response } from 'express';
import User, { ModerationStatus } from '../models/User';
import notificationService from '../services/notificationService';

const router = Router();

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

export default router;
