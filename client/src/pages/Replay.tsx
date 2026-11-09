import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Room as RoomType, ReplayEvent } from 'shared';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Play, Pause, Terminal, SkipBack, SkipForward, Clock } from 'lucide-react';

export const Replay: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [roomDetails, setRoomDetails] = useState<RoomType | null>(null);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rooms/${roomCode}/replay`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      setRoomDetails(res.data.room);
      setEvents(res.data.events);
    })
    .catch(err => {
      alert('Failed to load replay data');
      navigate('/dashboard');
    });
  }, [roomCode, navigate]);

  const maxTime = useMemo(() => {
    if (events.length === 0) return 0;
    const start = new Date(events[0].timestamp).getTime();
    const end = new Date(events[events.length - 1].timestamp).getTime();
    return end - start;
  }, [events]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const nextTime = prev + (1000 * playbackSpeed);
          if (nextTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxTime]);

  const currentEvents = useMemo(() => {
    if (events.length === 0) return { code: '', chats: [], executions: [] };
    
    const startTime = new Date(events[0].timestamp).getTime();
    const activeEvents = events.filter(e => new Date(e.timestamp).getTime() - startTime <= currentTime);
    
    const snapshots = activeEvents.filter(e => e.eventType === 'snapshot');
    const latestCode = snapshots.length > 0 ? snapshots[snapshots.length - 1].payload.code : '';
    
    const chats = activeEvents.filter(e => e.eventType === 'chat');
    const executions = activeEvents.filter(e => e.eventType === 'execution');
    
    return { code: latestCode, chats, executions };
  }, [events, currentTime]);

  if (!roomDetails) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-500 font-bold">Loading Replay...</div>;
  }

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentExecution = currentEvents.executions[currentEvents.executions.length - 1]?.payload;

  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-3 px-4 flex justify-between items-center z-20 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg text-white flex items-center gap-2">
            Interview Replay <span className="text-slate-400 text-xs font-normal">| Room: {roomCode}</span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* Left Sidebar (Problem & Chat) */}
        <div className="w-[350px] bg-slate-800 flex flex-col z-10 shrink-0 border-r border-slate-700 h-full min-h-0">
          <div className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <h2 className="font-bold text-white text-lg mb-4">Challenge</h2>
            <div className="prose prose-sm prose-invert break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{roomDetails.problemStatement || 'No problem statement provided.'}</ReactMarkdown>
            </div>
            
            <div className="mt-8 border-t border-slate-700 pt-4">
               <h2 className="font-bold text-white text-sm mb-4">Chat Timeline</h2>
               <div className="space-y-3">
                 {currentEvents.chats.length === 0 ? <p className="text-slate-500 text-xs italic">No chat messages yet.</p> : null}
                 {currentEvents.chats.map((chat: any, i: number) => (
                   <div key={i} className="bg-slate-700/50 p-2 rounded text-sm">
                     <span className="font-bold text-indigo-400 text-xs block mb-1">{chat.payload.senderName}</span>
                     <span className="text-slate-200">{chat.payload.text}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Center Editor Area */}
        <div className="flex-1 flex flex-col relative bg-[#1e1e1e] overflow-hidden min-h-0">
          
          <div className="flex-1 min-h-0">
             <Editor
                height="100%"
                language={roomDetails.language}
                theme="vs-dark"
                value={currentEvents.code}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 15,
                  wordWrap: 'on',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures: true,
                  padding: { top: 16 }
                }}
             />
          </div>
          
          {/* Output Panel */}
          {currentExecution && (
            <div className="h-64 border-t border-slate-700 bg-slate-800 flex flex-col z-20">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                <h3 className="font-semibold text-slate-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Terminal className="w-4 h-4" /> Latest Execution
                  <span className={`ml-3 px-2 py-0.5 rounded text-xs font-bold ${currentExecution.code === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    Code: {currentExecution.code}
                  </span>
                </h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] whitespace-pre-wrap leading-relaxed text-slate-300 custom-scrollbar">
                 {currentExecution.testResults ? (
                    <div>Test Cases mode executed (check full logs in real session)</div>
                 ) : (
                    <>
                      {currentExecution.stdout && <div className="text-slate-300">{currentExecution.stdout}</div>}
                      {currentExecution.stderr && <div className="text-red-400 mt-2">{currentExecution.stderr}</div>}
                    </>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Playback Controls Footer */}
      <div className="h-20 bg-slate-900 border-t border-slate-800 flex flex-col justify-center px-6 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-30">
         <div className="flex items-center gap-4">
            <button onClick={() => setCurrentTime(0)} className="text-slate-400 hover:text-white p-2">
               <SkipBack className="w-5 h-5" />
            </button>
            
            <button onClick={() => setIsPlaying(!isPlaying)} className="bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full shadow-lg">
               {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            
            <button onClick={() => setCurrentTime(maxTime)} className="text-slate-400 hover:text-white p-2">
               <SkipForward className="w-5 h-5" />
            </button>
            
            <span className="font-mono text-slate-300 font-bold ml-4 text-lg w-16 text-center">
              {formatTime(currentTime)}
            </span>
            
            <input 
              type="range" 
              min={0} 
              max={maxTime} 
              value={currentTime} 
              onChange={e => setCurrentTime(Number(e.target.value))}
              className="flex-1 mx-4 accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
            />
            
            <span className="font-mono text-slate-500 font-bold mr-4 text-lg w-16 text-center">
              {formatTime(maxTime)}
            </span>
            
            <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
               <Clock className="w-4 h-4 text-slate-500" />
               <select 
                 value={playbackSpeed} 
                 onChange={e => setPlaybackSpeed(Number(e.target.value))}
                 className="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-sm outline-none cursor-pointer"
               >
                 <option value={1}>1x</option>
                 <option value={2}>2x</option>
                 <option value={4}>4x</option>
                 <option value={8}>8x</option>
               </select>
            </div>
         </div>
      </div>

    </div>
  );
};
