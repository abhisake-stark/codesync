import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['interviewer', 'candidate'], required: true },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true }
});

const problemSchema = new mongoose.Schema({
  id: { type: String, default: () => nanoid(8) },
  title: { type: String, default: 'Untitled Problem' },
  statement: { type: String, default: '' },
  testCases: [testCaseSchema],
  generatorCode: { type: String, default: '' },
  validatorCode: { type: String, default: '' }
});

const roomSchema = new mongoose.Schema({
  interviewerCode: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => nanoid(10)
  },
  candidateCode: {
    type: String, 
    required: true, 
    unique: true, 
    default: () => nanoid(10)
  },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [participantSchema],
  problems: [problemSchema],
  language: { type: String, default: 'javascript' },
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  ydocState: { type: Buffer, default: null },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }
});

roomSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Room = mongoose.model('Room', roomSchema);
