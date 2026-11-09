import { Server, Socket } from 'socket.io';
import { 
  addParticipantToRedis, 
  removeParticipantFromRedis,
  addChatMessageToRedis,
  getChatHistoryFromRedis,
  getParticipantRoleFromRedis,
  getRoomParticipantsFromRedis
} from '../config/redis';
import { Room } from '../models/Room';
import { ReplayEvent } from '../models/ReplayEvent';
import { Participant } from 'shared';

const activeTimers = new Map<string, NodeJS.Timeout>();

export const setupRoomHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    socket.on('join-room', async (payload: { roomCode: string; name: string; userId: string }) => {
      try {
        const { roomCode, name, userId } = payload;
        
        const room = await Room.findOne({
          $or: [{ interviewerCode: roomCode }, { candidateCode: roomCode }],
          status: { $ne: 'ended' }
        });
        
        if (!room) {
          socket.emit('error', 'Room does not exist or has ended');
          return;
        }

        const roomId = room._id.toString();
        currentRoomId = roomId;
        currentUserId = userId;

        const role = roomCode === room.interviewerCode ? 'interviewer' : 'candidate';

        const participant: Participant = {
          userId,
          name,
          role,
          joinedAt: new Date().toISOString(),
          socketId: socket.id
        };

        const updatedParticipants = await addParticipantToRedis(roomId, participant, room.hostId.toString());
        
        socket.join(roomId);
        if (participant.role === 'interviewer') {
          socket.join(`${roomId}-interviewers`);
        }
        
        io.to(roomId).emit('participant-joined', updatedParticipants);
        
        const history = await getChatHistoryFromRedis(roomId);
        socket.emit('chat-history', history);
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', 'Internal server error while joining room');
      }
    });

    socket.on('change-language', (language: string) => {
      if (currentRoomId) {
        socket.to(currentRoomId).emit('language-changed', language);
      }
    });
    
    socket.on('send-chat-message', async (data: { text: string, isPrivate?: boolean } | string) => {
      if (currentRoomId && currentUserId) {
        const text = typeof data === 'string' ? data : data.text;
        const isPrivate = typeof data === 'string' ? false : !!data.isPrivate;

        const participants = await getRoomParticipantsFromRedis(currentRoomId);
        const p = participants.find(part => part.userId === currentUserId);
        
        const message = {
          id: Math.random().toString(36).substring(7),
          senderId: currentUserId,
          senderName: p ? p.name : 'Unknown',
          text,
          isPrivate,
          timestamp: new Date().toISOString()
        };
        
        await addChatMessageToRedis(currentRoomId, message);

        if (isPrivate) {
            io.to(`${currentRoomId}-interviewers`).emit('chat-message', message);
        } else {
            io.to(currentRoomId).emit('chat-message', message);
        }
      }
    });
    
    socket.on('candidate-visibility-changed', (isHidden: boolean) => {
        if (currentRoomId && currentUserId) {
            io.to(`${currentRoomId}-interviewers`).emit('candidate-visibility-alert', {
               userId: currentUserId,
               isHidden 
            });
        }
    });

    socket.on('start-timer', async (durationSeconds: number) => {
      if (!currentRoomId || !currentUserId) return;
      
      const role = await getParticipantRoleFromRedis(currentRoomId, currentUserId);
      if (role !== 'interviewer') return;
      
      if (activeTimers.has(currentRoomId)) {
        clearInterval(activeTimers.get(currentRoomId)!);
      }
      
      let remaining = durationSeconds;
      io.to(currentRoomId).emit('timer-tick', remaining);
      
      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(activeTimers.get(currentRoomId!)!);
          activeTimers.delete(currentRoomId!);
          io.to(currentRoomId!).emit('timer-ended');
        } else {
          io.to(currentRoomId!).emit('timer-tick', remaining);
        }
      }, 1000);
      
      activeTimers.set(currentRoomId, interval);
    });

    socket.on('webrtc-signal', (payload) => {
      if (currentRoomId && currentUserId) {
        socket.to(currentRoomId).emit('webrtc-signal', {
          senderId: currentUserId,
          targetUserId: payload.targetUserId,
          signal: payload.signal
        });
      }
    });
    
    socket.on('save-snapshot', async (payload: { roomCode: string, code: string }) => {
      if (currentRoomId) {
         await ReplayEvent.create({
           roomCode: currentRoomId,
           eventType: 'snapshot',
           payload: { code: payload.code }
         });
      }
    });

    socket.on('disconnect', async () => {
      if (currentRoomId) {
        const updatedParticipants = await removeParticipantFromRedis(currentRoomId, socket.id);
        io.to(currentRoomId).emit('participant-left', updatedParticipants);
      }
    });
  });
};
