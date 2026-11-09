import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  roomId: mongoose.Types.ObjectId;
  feedback: {
    rating: number;
    notes: string;
    verdict: 'hire' | 'no-hire' | 'undecided';
  };
  codeSnapshot: string;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  feedback: {
    rating: { type: Number, required: true },
    notes: { type: String, default: '' },
    verdict: { type: String, enum: ['hire', 'no-hire', 'undecided'], required: true }
  },
  codeSnapshot: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const Session = mongoose.model<ISession>('Session', sessionSchema);
