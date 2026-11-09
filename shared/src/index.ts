export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
}

export interface Participant {
  userId: string;
  name: string;
  role: 'interviewer' | 'candidate';
  joinedAt: Date | string;
  socketId?: string;
}

export interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
}

export interface Problem {
  _id?: string;
  title: string;
  statement: string;
  testCases: TestCase[];
  generatorCode?: string;
  validatorCode?: string;
}

export interface Room {
  id: string;
  _id: string;
  interviewerCode: string;
  candidateCode?: string;
  hostId: string;
  participants: Participant[];
  problems: Problem[];
  language: string;
  status: 'waiting' | 'active' | 'ended';
  ydocState?: any;
  createdAt: Date | string;
  endedAt?: Date | string;
  myRole?: 'interviewer' | 'candidate';
}

export interface SessionFeedback {
  rating: number;
  notes: string;
  verdict: 'hire' | 'no-hire' | 'undecided';
}

export interface Session {
  id: string;
  roomId: string;
  feedback: SessionFeedback;
  codeSnapshot: string;
  createdAt: Date | string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface TestResult {
  testCaseIndex: number;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  input: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  code: number;
  testResults?: TestResult[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isPrivate?: boolean;
  timestamp: string;
}

export interface ServerToClientEvents {
  'participant-joined': (participants: Participant[]) => void;
  'participant-left': (participants: Participant[]) => void;
  'room-ended': () => void;
  'error': (message: string) => void;
  
  'language-changed': (language: string) => void;
  
  'execution-started': () => void;
  'execution-result': (result: ExecutionResult) => void;
  
  // Timer
  'timer-tick': (remainingSeconds: number) => void;
  'timer-ended': () => void;
  
  // Chat
  'chat-history': (messages: ChatMessage[]) => void;
  'chat-message': (message: ChatMessage) => void;
  
  // Problem Update
  'problem-updated': (problems: Problem[]) => void;
  'snapshot-saved': () => void;
  'candidate-visibility-alert': (payload: { userId: string, isHidden: boolean }) => void;

  // WebRTC
  'webrtc-signal': (payload: { senderId: string, targetUserId: string, signal: any }) => void;
}

export interface ClientToServerEvents {
  'join-room': (payload: { roomCode: string; name: string; userId: string }) => void;
  'change-language': (language: string) => void;
  
  // Timer
  'start-timer': (durationSeconds: number) => void;
  
  // Chat
  'send-chat-message': (payload: { text: string, isPrivate?: boolean } | string) => void;
  'candidate-visibility-changed': (isHidden: boolean) => void;

  // WebRTC
  'webrtc-signal': (payload: { targetUserId: string, signal: any }) => void;
  'save-snapshot': (payload: { roomCode: string, code: string }) => void;
}

export interface ReplayEvent {
  id?: string;
  roomCode: string;
  eventType: 'snapshot' | 'execution' | 'chat';
  timestamp: string | Date;
  payload: any;
}
