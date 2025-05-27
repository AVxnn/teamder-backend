require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
import paymentService from '../services/paymentService';

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

export const bot = new TelegramBot(token, { polling: true });

// Обработка успешных платежей
bot.on('successful_payment', async (msg: any) => {
  try {
    const { invoice_payload, telegram_payment_charge_id } = msg.successful_payment;
    await paymentService.handleSuccessfulPayment(invoice_payload, telegram_payment_charge_id);
    await bot.sendMessage(msg.chat.id, '✅ Спасибо за покупку! Звезды успешно начислены на ваш счет.');
  } catch (error) {
    console.error('Error handling successful payment:', error);
    await bot.sendMessage(msg.chat.id, '❌ Произошла ошибка при обработке платежа. Пожалуйста, обратитесь в поддержку.');
  }
});

export function startBot() {
  bot.onText(/\/start/, (msg: any) => {
    const chatId = msg.chat.id;
  
    bot.sendMessage(
      chatId,
      "Привет! Чтобы найти себе тиммейтов кликай на кнопку ниже 👇",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Открыть TeamDer",
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      }
    );
  });
  
  console.log("🤖 Бот запущен");
}