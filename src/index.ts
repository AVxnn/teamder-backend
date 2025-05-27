import express from 'express';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { startBot } from './bot/bot';
import authRoutes from './routes/auth';
import profileRoutes from "./routes/profile"
import moderationRoutes from "./routes/moderation"
import notificationRoutes from "./routes/notifications"
import recommendationRoutes from "./routes/recommendations"
import cors from 'cors';
import mongoose from 'mongoose';
import paymentRoutes from './routes/payments';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;
// Пример строки подключения (замени на свою)
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/teamder';
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
console.log('URI used:', mongoURI);
const corsConfig = {
  origin: true,
  optionSuccessStatus: 200,
  credentials: true,
}

app.use(cors(corsConfig));
app.use(express.json());


if (!mongoURI) {
  console.error('❌ MONGO_URI не найден в .env');
  process.exit(1); // Остановим запуск, если нет URI
} else {
  console.log('✅ MONGO_URI найден в .env');
}
  
async function run() {
  try {
    mongoose.set('strictQuery', true);
    mongoose.set('debug', true);
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log('✅ Connected to MongoDB');
    
    // Тестовый запрос для проверки подключения
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().command({ ping: 1 });
      console.log("✅ MongoDB ping successful");
    }

  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}
run().catch(console.dir);

app.use('/api', apiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/payments', paymentRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

// Запуск бота
startBot();