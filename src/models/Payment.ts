import mongoose from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum PaymentType {
  STARS = 'stars'
}

const PaymentSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  type: { 
    type: String, 
    enum: Object.values(PaymentType),
    required: true 
  },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING 
  },
  invoiceId: { type: String },
  paymentId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Payment', PaymentSchema); 