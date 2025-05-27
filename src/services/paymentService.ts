import { bot } from '../bot/bot';
import Payment, { PaymentStatus, PaymentType } from '../models/Payment';
import User from '../models/User';

class PaymentService {
  // Создание инвойса для оплаты звездами
  async createStarsInvoice(userId: number, amount: number) {
    try {
      if (!process.env.TELEGRAM_PAYMENT_TOKEN) {
        throw new Error('Payment token is not configured. Please set TELEGRAM_PAYMENT_TOKEN in .env file');
      }

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Создаем запись о платеже
      const payment = new Payment({
        userId,
        type: PaymentType.STARS,
        amount,
        status: PaymentStatus.PENDING
      });
      await payment.save();

      // Создаем инвойс в Telegram
      const invoice = await bot.sendInvoice(
        userId,
        'Покупка звезд',
        `Покупка ${amount} звезд для Teamder`,
        payment._id.toString(),
        process.env.TELEGRAM_PAYMENT_TOKEN,
        'XTR',
        [{ label: 'Stars', amount: amount }], // amount в копейках
        {
          max_tip_amount: 0,
          suggested_tip_amounts: []
        }
      );

      // Сохраняем ID инвойса
      payment.invoiceId = invoice.invoice_id;
      await payment.save();

      return {
        paymentId: payment._id,
        invoiceId: invoice.invoice_id,
        invoiceUrl: invoice.invoice_url
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Обработка успешного платежа
  async handleSuccessfulPayment(paymentId: string, telegramPaymentId: string) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.status = PaymentStatus.COMPLETED;
      payment.paymentId = telegramPaymentId;
      payment.updatedAt = new Date();
      await payment.save();

      // Обновляем баланс пользователя
      const user = await User.findOne({ telegramId: payment.userId });
      if (user) {
        user.stars = (user.stars || 0) + payment.amount;
        await user.save();
      }

      return payment;
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  // Получение истории платежей пользователя
  async getUserPayments(userId: number, limit: number = 20) {
    return Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

export default new PaymentService(); 