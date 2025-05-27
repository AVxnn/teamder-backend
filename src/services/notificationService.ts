import Notification, { NotificationType } from '../models/Notification';
import User from '../models/User';
import { bot } from '../bot/bot';

class NotificationService {
  // Создание уведомления
  private async createNotification(
    telegramId: number,
    type: NotificationType,
    message: string,
    data: any = {}
  ) {
    try {
      console.log("Creating notification:", {
        telegramId,
        type,
        message,
        data
      });
      
      const notification = new Notification({
        telegramId,
        type,
        message,
        data
      });
      await notification.save();
      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Отправка уведомления в Telegram
  private async sendTelegramNotification(telegramId: number, message: string) {
    try {
      await bot.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      
      console.log(`✅ Telegram notification sent to ${telegramId}`);
    } catch (error) {
      console.error('❌ Error sending Telegram notification:', error);
      // Можно добавить дополнительную логику обработки ошибок
      if (error.code === 'ETELEGRAM') {
        console.error('Telegram API error:', error.description);
      }
    }
  }

  // Уведомление о лайке
  async notifyLike(fromTelegramId: number, toTelegramId: number) {
    const fromUser = await User.findOne({ telegramId: fromTelegramId });
    const toUser = await User.findOne({ telegramId: toTelegramId });
    
    if (!fromUser || !toUser) return;

    const message = `💖 ${fromUser.username} поставил(а) вам лайк!`;
    
    await this.createNotification(
      toTelegramId,
      NotificationType.LIKE,
      message,
      { fromUserId: fromUser._id }
    );

    await this.sendTelegramNotification(toUser.telegramId, message);
  }

  // Уведомление о суперлайке
  async notifySuperLike(fromTelegramId: number, toTelegramId: number) {
    const fromUser = await User.findOne({ telegramId: fromTelegramId });
    const toUser = await User.findOne({ telegramId: toTelegramId });
    
    if (!fromUser || !toUser) return;

    const message = `⭐ ${fromUser.username} поставил(а) вам суперлайк!`;
    
    await this.createNotification(
      toTelegramId,
      NotificationType.SUPER_LIKE,
      message,
      { fromUserId: fromUser._id }
    );

    await this.sendTelegramNotification(toUser.telegramId, message);
  }

  // Уведомление о отправке на модерацию
  async notifyProfilePending(telegramId: number) {
    const user = await User.findOne({ telegramId });
    if (!user) return;

    const message = '📝 Ваша карточка отправлена на модерацию';
    
    await this.createNotification(
      telegramId,
      NotificationType.PROFILE_PENDING,
      message
    );

    await this.sendTelegramNotification(user.telegramId, message);
  }

  // Уведомление об одобрении карточки
  async notifyProfileApproved(telegramId: number) {
    const user = await User.findOne({ telegramId });
    if (!user) return;

    const message = '✅ Ваша карточка прошла модерацию и теперь видна другим пользователям';
    
    await this.createNotification(
      telegramId,
      NotificationType.PROFILE_APPROVED,
      message
    );

    await this.sendTelegramNotification(user.telegramId, message);
  }

  // Уведомление об отклонении карточки
  async notifyProfileRejected(telegramId: number, comment: string) {
    const user = await User.findOne({ telegramId });
    if (!user) return;

    const message = `❌ Ваша карточка не прошла модерацию.\nПричина: ${comment}`;
    
    await this.createNotification(
      telegramId,
      NotificationType.PROFILE_REJECTED,
      message,
      { moderationComment: comment }
    );

    await this.sendTelegramNotification(user.telegramId, message);
  }

  // Получение уведомлений пользователя
  async getUserNotifications(telegramId: number, limit: number = 20) {
    return Notification.find({ telegramId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('data.fromUserId', 'username firstName photoUrl')
      .populate('data.profileId', 'username firstName photoUrl');
  }

  // Отметка уведомления как прочитанного
  async markAsRead(notificationId: string) {
    return Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
  }

  // Отметка всех уведомлений как прочитанных
  async markAllAsRead(telegramId: number) {
    return Notification.updateMany(
      { telegramId, isRead: false },
      { isRead: true }
    );
  }
}

export default new NotificationService(); 