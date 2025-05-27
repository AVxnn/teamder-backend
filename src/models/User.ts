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
  REJECTED = 'rejected'
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

  likesGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stars: { type: Number, default: 0 },
});

export default mongoose.model('User', UserSchema);
