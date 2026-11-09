import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Participant, ServerToClientEvents, ClientToServerEvents, ExecutionResult, ChatMessage } from 'shared';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const useRoomSocket = (
  roomCode: string, 
  onLanguageChange?: (lang: string) => void,
  onProblemUpdate?: (problem: string) => void
) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  
  // Timer states
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timeIsUp, setTimeIsUp] = useState(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomCode,
        name: user.name,
        userId: user.id
      });
    });

    socket.on('participant-joined', (updatedParticipants) => {
      setParticipants(updatedParticipants);
    });

    socket.on('participant-left', (updatedParticipants) => {
      setParticipants(updatedParticipants);
    });

    socket.on('language-changed', (lang) => {
      if (onLanguageChange) onLanguageChange(lang);
    });
    
    socket.on('problem-updated', (newProblem) => {
      if (onProblemUpdate) onProblemUpdate(newProblem);
    });
    
    socket.on('execution-started', () => {
      setIsExecuting(true);
      setExecutionResult(null);
    });
    
    socket.on('execution-result', (result) => {
      setIsExecuting(false);
      setExecutionResult(result);
    });
    
    socket.on('timer-tick', (remainingSeconds) => {
      setTimerRemaining(remainingSeconds);
      setTimeIsUp(false);
    });
    
    socket.on('timer-ended', () => {
      setTimerRemaining(0);
      setTimeIsUp(true);
    });
    
    socket.on('chat-history', (messages) => {
      setChatMessages(messages);
    });
    
    socket.on('chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('room-ended', () => {
      navigate(`/room/${roomCode}/ended`);
    });

    
    socket.on('candidate-visibility-alert', ({ userId, isHidden }) => {
        const participant = participants.find(p => p.userId === userId) || { name: 'Candidate' };
        alert(`⚠️ ALERT: ${participant.name} has ${isHidden ? 'HIDDEN' : 'RETURNED TO'} the tab!`);
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, user, navigate]);

  const changeLanguage = (lang: string) => {
    if (socketRef.current) {
      socketRef.current.emit('change-language', lang);
    }
  };
  
  const startTimer = (durationSeconds: number) => {
    if (socketRef.current) {
      socketRef.current.emit('start-timer', durationSeconds);
    }
  };
  
  const sendChatMessage = (data: {text: string, isPrivate?: boolean}) => { if (socketRef.current) socketRef.current.emit('send-chat-message', data); };

  
  const saveSnapshot = (code: string) => {
    if (socketRef.current) {
      socketRef.current.emit('save-snapshot', { roomCode, code });
    }
  };

  const clearOutput = () => {
    setExecutionResult(null);
  };

  return { setExecutionResult, 
    socket: socketRef.current, 
    participants, 
    error, 
    changeLanguage, 
    isExecuting, 
    executionResult,
    clearOutput,
    timerRemaining,
    timeIsUp,
    startTimer,
    chatMessages,
    sendChatMessage,
    saveSnapshot
  };
};
