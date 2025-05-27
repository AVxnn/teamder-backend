import { Router, Request, Response } from 'express';
import recommendationService from '../services/recommendationService';
import User from '../models/User';

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

// Получение рекомендаций
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const filters = {
      minRating: req.body.minRating ? Number(req.body.minRating) : undefined,
      maxRating: req.body.maxRating ? Number(req.body.maxRating) : undefined,
      minGamesPlayed: req.body.minGamesPlayed ? Number(req.body.minGamesPlayed) : undefined,
      maxGamesPlayed: req.body.maxGamesPlayed ? Number(req.body.maxGamesPlayed) : undefined,
      lookingFor: req.body.lookingFor as string | undefined
    };

    const recommendations = await recommendationService.getRecommendations(req.body.telegramId, filters);
    res.json(recommendations);
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Лайк пользователя
router.post('/like', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { toTelegramId } = req.body;
    if (!toTelegramId) {
      return res.status(400).json({ error: 'toTelegramId is required' });
    }

    const result = await recommendationService.likeUser(req.body.telegramId, toTelegramId);
    res.json(result);
  } catch (error: any) {
    console.error('Error liking user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Суперлайк пользователя
router.post('/super-like', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { toTelegramId } = req.body;
    if (!toTelegramId) {
      return res.status(400).json({ error: 'toTelegramId is required' });
    }

    const result = await recommendationService.superLikeUser(req.body.telegramId, toTelegramId);
    res.json(result);
  } catch (error: any) {
    console.error('Error super liking user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Дизлайк пользователя
router.post('/dislike', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { toTelegramId } = req.body;
    if (!toTelegramId) {
      return res.status(400).json({ error: 'toTelegramId is required' });
    }

    const result = await recommendationService.dislikeUser(req.body.telegramId, toTelegramId);
    res.json(result);
  } catch (error: any) {
    console.error('Error disliking user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение информации о лайках
router.get('/likes-info', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const likesInfo = await recommendationService.getLikesInfo(req.body.telegramId);
    res.json(likesInfo);
  } catch (error: any) {
    console.error('Error getting likes info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Покупка дополнительных лайков
router.post('/purchase-likes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { amount, starsCost } = req.body;
    if (!amount || !starsCost) {
      return res.status(400).json({ error: 'amount and starsCost are required' });
    }

    const result = await recommendationService.purchaseExtraLikes(req.body.telegramId, amount, starsCost);
    res.json(result);
  } catch (error: any) {
    console.error('Error purchasing likes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Покупка дополнительных суперлайков
router.post('/purchase-super-likes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { amount, starsCost } = req.body;
    if (!amount || !starsCost) {
      return res.status(400).json({ error: 'amount and starsCost are required' });
    }

    const result = await recommendationService.purchaseExtraSuperLikes(req.body.telegramId, amount, starsCost);
    res.json(result);
  } catch (error: any) {
    console.error('Error purchasing super likes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение списка тех, кто лайкнул пользователя
router.post('/likes-received', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const likes = await recommendationService.getLikesReceived(req.body.telegramId);
    res.json(likes);
  } catch (error: any) {
    console.error('Error getting likes received:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение списка тех, кого пользователь лайкнул
router.post('/likes-given', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const likes = await recommendationService.getLikesGiven(req.body.telegramId);
    res.json(likes);
  } catch (error: any) {
    console.error('Error getting likes given:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение информации о лайках между пользователями
router.post('/likes-between', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { toTelegramId } = req.body;
    if (!toTelegramId) {
      return res.status(400).json({ error: 'toTelegramId is required' });
    }

    const likesInfo = await recommendationService.getLikesBetweenUsers(req.body.telegramId, toTelegramId);
    res.json(likesInfo);
  } catch (error: any) {
    console.error('Error getting likes between users:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 