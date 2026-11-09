import mongoose from 'mongoose';

const replayEventSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, index: true },
  eventType: { type: String, enum: ['snapshot', 'execution', 'chat'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true }
});

replayEventSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const ReplayEvent = mongoose.model('ReplayEvent', replayEventSchema);
