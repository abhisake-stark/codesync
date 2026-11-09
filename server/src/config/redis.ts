import Redis from 'ioredis';
import { Participant, ChatMessage } from 'shared';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully.');
});

const getRoomKey = (roomCode: string) => `room:${roomCode}:participants`;
const getChatKey = (roomCode: string) => `room:${roomCode}:chat`;

export const addParticipantToRedis = async (roomCode: string, participant: Participant, hostId?: string): Promise<Participant[]> => {
  const key = getRoomKey(roomCode);
  const rawData = await redis.get(key);
  let participants: Participant[] = rawData ? JSON.parse(rawData) : [];
  
  const existingIndex = participants.findIndex(p => p.userId === participant.userId);
  
  if (existingIndex > -1) {
    participant.role = participants[existingIndex].role;
    participants[existingIndex] = participant;
  } else {
    if (hostId && participant.userId === hostId) {
      participant.role = 'interviewer';
    } else if (!participants.some(p => p.role === 'candidate')) {
      participant.role = 'candidate';
    } else {
      participant.role = 'spectator';
    }
    participants.push(participant);
  }
  
  await redis.set(key, JSON.stringify(participants), 'EX', 60 * 60 * 24);
  return participants;
};

export const getRoomParticipantsFromRedis = async (roomCode: string): Promise<Participant[]> => {
  const key = getRoomKey(roomCode);
  const rawData = await redis.get(key);
  return rawData ? JSON.parse(rawData) : [];
};

export const removeParticipantFromRedis = async (roomCode: string, socketId: string): Promise<Participant[]> => {
  const key = getRoomKey(roomCode);
  const rawData = await redis.get(key);
  let participants: Participant[] = rawData ? JSON.parse(rawData) : [];
  
  participants = participants.filter(p => p.socketId !== socketId);
  
  if (participants.length > 0) {
    await redis.set(key, JSON.stringify(participants), 'EX', 60 * 60 * 24);
  } else {
    await redis.del(key);
  }
  
  return participants;
};

export const getParticipantRoleFromRedis = async (roomCode: string, userId: string): Promise<string | null> => {
  const participants = await getRoomParticipantsFromRedis(roomCode);
  const participant = participants.find(p => p.userId === userId);
  return participant ? participant.role : null;
};

export const checkRateLimit = async (roomCode: string): Promise<boolean> => {
  const limitKey = `rate_limit:execute:${roomCode}`;
  const exists = await redis.exists(limitKey);
  if (exists) return false;
  await redis.set(limitKey, '1', 'EX', 1);
  return true;
};

export const addChatMessageToRedis = async (roomCode: string, message: ChatMessage): Promise<void> => {
  const key = getChatKey(roomCode);
  await redis.rpush(key, JSON.stringify(message));
  await redis.expire(key, 60 * 60 * 24);
};

export const getChatHistoryFromRedis = async (roomCode: string): Promise<ChatMessage[]> => {
  const key = getChatKey(roomCode);
  const rawMessages = await redis.lrange(key, 0, -1);
  return rawMessages.map(msg => JSON.parse(msg));
};
