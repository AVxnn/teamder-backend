import mongoose from 'mongoose';

// Define possible user roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  PREMIUM = 'premium'
}

// Define moderation status
export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted'
}

// Определяем интерфейс для лайка
interface Like {
  userId: mongoose.Types.ObjectId;
  type: 'regular' | 'super';
  date: Date;
  isMutual: boolean;
}

const UserSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  photoUrl: { type: String },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  role: { 
    type: String, 
    enum: Object.values(UserRole),
    default: UserRole.USER 
  },

  // Карточка пользователя
  profile: {
    nickname: String,
    about: String,
    lookingFor: String,
    steamId: String,
    rating: Number,
    hoursPlayed: Number,
    wins: Number,
    losses: Number,
    discordLink: String,
    steamLink: String,
    cardImage: String, // base64 или URL
    moderationStatus: {
      type: String,
      enum: Object.values(ModerationStatus),
      default: ModerationStatus.PENDING
    },
    moderationComment: String,
    moderatedAt: Date,
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Лайки
  likesGiven: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['regular', 'super'] },
    date: { type: Date, default: Date.now },
    isMutual: { type: Boolean, default: false }
  }],
  likesReceived: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['regular', 'super'] },
    date: { type: Date, default: Date.now },
    isMutual: { type: Boolean, default: false }
  }],
  
  stars: { type: Number, default: 0 },
  
  // Система лимитов лайков
  likesLimit: {
    dailyLimit: { type: Number, default: 20 },
    likesUsedToday: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
    extraLikes: { type: Number, default: 0 } // Дополнительные лайки, купленные за звезды
  },

  // Система лимитов суперлайков
  superLikesLimit: {
    dailyLimit: { type: Number, default: 3 }, // Меньше суперлайков в день
    superLikesUsedToday: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
    extraSuperLikes: { type: Number, default: 0 } // Дополнительные суперлайки, купленные за звезды
  }
});

export default mongoose.model('User', UserSchema);
