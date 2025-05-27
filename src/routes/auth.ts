import { Router, Request, Response } from 'express';
import UserModel from '../models/User';

const router = Router();

interface TelegramUserData {
  id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
  auth_date?: number;
  hash?: string;
}

router.post('/telegram-webapp', async (req: Request, res: Response): Promise<void> => {
  const { id, username, first_name, photo_url, auth_date, hash } = req.body as TelegramUserData;

  // Валидация входящих данных
  if (!id) {
    res.status(400).json({ error: 'Telegram ID is required' });
    return;
  }

  try {
    // Поиск пользователя в базе
    let user = await UserModel.findOne({ telegramId: id });

    // Если пользователь не найден - создаем нового
    if (!user) {
      user = new UserModel({
        telegramId: id,
        username: username || `user_${id}`,
        firstName: first_name || 'Anonymous',
        photoUrl: photo_url || '',
        authDate: auth_date,
        lastLogin: new Date(),
        createdAt: new Date()
      });

      await user.save();
      console.log(`✅ New user created: ${user.username}`);
    } else {
      // Обновляем данные существующего пользователя
      user.lastLogin = new Date();
      if (photo_url) user.photoUrl = photo_url;
      if (first_name) user.firstName = first_name;
      await user.save();
    }

    // Формируем полный ответ со всеми данными пользователя
    const userResponse = {
      id: user.telegramId,
      username: user.username,
      first_name: user.firstName,
      photo_url: user.photoUrl,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      profile: user.profile,
      likesGiven: user.likesGiven,
      likesReceived: user.likesReceived
    };

    res.json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

export default router;