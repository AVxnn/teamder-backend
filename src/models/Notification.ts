import mongoose from 'mongoose';

export enum NotificationType {
  LIKE = 'like',
  SUPER_LIKE = 'superlike',
  PROFILE_PENDING = 'waiting',
  PROFILE_APPROVED = 'moderation-success',
  PROFILE_REJECTED = 'moderation-fail',
  PROFILE_DELETED = 'profile-deleted'
}

const NotificationSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  type: { 
    type: String, 
    enum: Object.values(NotificationType),
    required: true 
  },
  message: { type: String, required: true },
  data: {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderationComment: String
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', NotificationSchema); 