import { Router, Request, Response } from 'express';
import { bot } from '../bot/bot';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong' });
});

router.post('/send-message', async (req: Request, res: Response) => {
  const { chatId, text } = req.body;

  try {
    await bot.telegram.sendMessage(chatId, text);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
