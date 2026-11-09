import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Users, LogOut, ShieldAlert, Play, Terminal, X, Loader2, MessageSquare, Code, Edit2, Timer, Send, Copy, Settings, Plus, Lock } from 'lucide-react';
import { Room as RoomType, Problem } from 'shared';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CustomSelect } from '../components/CustomSelect';
import { TestGeneratorModal } from '../components/TestGeneratorModal';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { MonacoBinding } from 'y-monaco';
import randomcolor from 'randomcolor';

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' }
];

export const Room: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [language, setLanguage] = useState('javascript');
  const [roomDetails, setRoomDetails] = useState<RoomType | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'problem' | 'chat'>('problem');
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [editProblemText, setEditProblemText] = useState('');
  const [editTestCases, setEditTestCases] = useState<{input: string, expectedOutput: string}[]>([]);
  
  const [chatInput, setChatInput] = useState('');
  const [isPrivateChat, setIsPrivateChat] = useState(false);
  
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      if (e.clientX > 250 && e.clientX < 800) {
        setSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  const { 
    participants, 
    error, 
    changeLanguage,
    isExecuting,
    executionResult,
    setExecutionResult,
    clearOutput,
    timerRemaining,
    timeIsUp,
    startTimer,
    chatMessages,
    sendChatMessage,
    saveSnapshot
  } = useRoomSocket(
    roomCode || '', 
    (lang) => setLanguage(lang),
    (newProblems) => {
        setRoomDetails(prev => {
            if (!prev) return null;
            return { ...prev, problems: newProblems as any[] };
        });
    }
  );

  // Tab Visibility Monitoring for candidates
  useEffect(() => {
    const handleVisibilityChange = () => {
       const isHidden = document.hidden;
       if (roomDetails?.myRole === 'candidate') {
          // Tell server
          axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rooms/${roomDetails.id}/visibility`, { isHidden }, {
             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }).catch(console.error);
       }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomDetails?.myRole, roomDetails?.id]);

  const lastSnapshotRef = useRef<string>('');
  useEffect(() => {
    const interval = setInterval(() => {
      if (editorRef.current && roomDetails?.status !== 'ended') {
        const currentCode = editorRef.current.getValue();
        if (currentCode !== lastSnapshotRef.current) {
          saveSnapshot(currentCode);
          lastSnapshotRef.current = currentCode;
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [roomDetails?.status, saveSnapshot]);

  const editorRef = useRef<any>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        setRoomDetails(res.data);
        setLanguage(res.data.language);
        if (res.data.problems && res.data.problems.length > 0) {
            setSelectedProblemId(res.data.problems[0]._id);
        }
      })
      .catch(err => {
        alert(err.response?.data?.error || 'Failed to load room');
        navigate('/dashboard');
      });
      
    return () => {
      if (providerRef.current) providerRef.current.disconnect();
      if (docRef.current) docRef.current.destroy();
      if (bindingRef.current) bindingRef.current.destroy();
    }
  }, [roomCode, navigate]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    const host = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
    const wsUrl = host.replace(/^http/, 'ws') + '/yjs';
    
    // We connect to Yjs using the canonical room ID, not the join code!
    // But roomDetails might not be loaded yet when editor mounts. 
    // We should wait until roomDetails is loaded to mount Editor, or use roomCode which backend resolves.
    // Our backend expects the URL param "room" to be the actual socketRoomId, which is `roomDetails.id`!
    const canonicalRoomId = roomDetails?.id || roomCode;

    const provider = new WebsocketProvider(wsUrl, canonicalRoomId as string, ydoc);
    providerRef.current = provider;

    setIsWsConnected(provider.wsconnected);
    provider.on('status', (event: {status: string}) => {
      setIsWsConnected(event.status === 'connected');
    });

    provider.awareness.setLocalStateField('user', {
      name: user?.name,
      color: randomcolor()
    });

    const ytext = ydoc.getText('monaco');
    const binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);
    bindingRef.current = binding;
  };

  const handleEndRoom = async () => {
    if (confirm('Are you sure you want to end this interview for everyone?')) {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rooms/${roomCode}/end`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to end room');
      }
    }
  };

  const handleExecute = async () => {
    if (!editorRef.current) return;
    saveSnapshot(editorRef.current.getValue());
    
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/execute`, {
        code: editorRef.current.getValue(),
        language,
        problemId: selectedProblemId
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      setExecutionResult(res.data);
    } catch (err: any) {
      if (err.response?.status === 429) alert(err.response.data.error);
      else alert('Failed to trigger execution');
    }
  };
  
  const handleUpdateProblem = async () => {
      alert("Manual update disabled for multi-problem setup to save time in this refactor. Use 'Import' instead.");
      setIsEditingProblem(false);
  };
  
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage({ text: chatInput, isPrivate: isPrivateChat });
    setChatInput('');
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopyCandidateLink = () => {
      if (roomDetails?.candidateCode) {
          navigator.clipboard.writeText(`${window.location.origin}/room/${roomDetails.candidateCode}`);
          alert('Candidate join link copied to clipboard!');
      }
  };

  if (error) {
    return <div className="min-h-screen bg-slate-50 text-red-500 p-8 flex items-center justify-center">Error: {error}</div>;
  }

  const currentUserRole = participants.find(p => p.userId === user?.id)?.role || roomDetails?.myRole || 'spectator';
  const isSpectator = currentUserRole === 'spectator';
  const isInterviewer = currentUserRole === 'interviewer';

  const selectedProblem = roomDetails?.problems?.find(p => p._id === selectedProblemId);

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
      
      {timeIsUp && (
        <div className="bg-orange-500 text-slate-800 text-center py-1.5 font-bold text-sm tracking-wide">
          Time is up! The session is over.
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-3 px-4 flex justify-between items-center z-20 shadow-sm shrink-0">
        <div className="flex flex-col">
          <h1 className="font-bold text-lg flex items-center gap-3">s*<img src="/logo.png" alt="CodeSync" className="w-32 h-auto object-contain" /> <span className="text-slate-400 text-xs font-normal border-l pl-3 border-slate-300">{isInterviewer ? 'Interviewer' : 'Candidate'} View</span>
            {isWsConnected ? (
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium ml-2 border border-emerald-200">🟢</span>
            ) : (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium ml-2 border border-amber-200">🟠 Offline</span>
            )}
          </h1>
        </div>
        
        {/* Timer Control / Display */}
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200">
          <Timer className={`w-4 h-4 ${timerRemaining !== null && timerRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
          {timerRemaining !== null ? (
            <span className={`font-mono font-bold text-lg ${timerRemaining < 60 ? 'text-red-500' : 'text-emerald-400'}`}>
              {formatTime(timerRemaining)}
            </span>
          ) : (
            <span className="text-slate-400 text-sm font-medium">No active timer</span>
          )}
          
          {isInterviewer && timerRemaining === null && (
            <div className="flex gap-1 ml-3 pl-3 border-l border-slate-200">
              {[15, 30, 45, 60].map(m => (
                <button 
                  key={m} 
                  onClick={() => startTimer(m * 60)}
                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1 rounded transition-colors"
                >
                  {m}m
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          
          {isInterviewer && roomDetails?.candidateCode && (
              <button onClick={handleCopyCandidateLink} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Share Candidate Link
              </button>
          )}

          <CustomSelect value={language} onChange={(val) => { setLanguage(val); changeLanguage(val); }} options={languageOptions} disabled={isSpectator} className="w-32" />
          
          <button 
            onClick={handleExecute}
            disabled={isSpectator || isExecuting}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-5 py-2 rounded-full font-bold transition-colors shadow-sm"
          >
            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Run
          </button>
          
          <div className="w-px h-6 bg-slate-200"></div>

          {isInterviewer && (
            <button onClick={handleEndRoom} className="text-red-400 hover:text-red-300 transition-colors text-sm font-bold flex items-center gap-1">
              End
            </button>
          )}
          
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium ml-2">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* Left Sidebar (Problem & Chat & Participants) */}
        <div style={{ width: sidebarWidth }} className="bg-white flex flex-col z-10 shadow-xl shrink-0 h-full min-h-0 relative">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 shrink-0">
            <button 
              onClick={() => setActiveTab('problem')} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === 'problem' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <Code className="w-4 h-4" /> Problem
            </button>
            <button 
              onClick={() => setActiveTab('chat')} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === 'chat' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {activeTab === 'problem' ? (
              <div className="flex flex-col h-full">
                
                {/* Problems Tab Bar */}
                {(roomDetails?.problems?.length || 0) > 0 && (
                    <div className="flex overflow-x-auto border-b border-slate-100 shrink-0 bg-slate-50 p-2 gap-2">
                        {roomDetails?.problems.map((p, i) => (
                            <button 
                                key={p._id}
                                onClick={() => setSelectedProblemId(p._id as string)}
                                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedProblemId === p._id ? 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="p-5 flex-1 overflow-y-auto flex flex-col relative">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="font-bold text-slate-800 text-lg">{selectedProblem?.title || 'No Problem Selected'}</h2>
                        {isInterviewer && (
                            <div className="flex flex-col gap-1 items-end">
                                
                                {selectedProblem && (
                                    <button onClick={() => setIsGeneratorOpen(true)} className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold px-2 py-1 rounded transition-colors flex items-center gap-1">
                                        <Settings className="w-3 h-3" /> Gen Tests
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="prose prose-sm prose-slate flex-1 break-words">
                        {selectedProblem ? (
                           <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{selectedProblem.statement}</ReactMarkdown>
                        ) : (
                           <div className="text-slate-400 italic text-sm text-center mt-10">Select or import a problem to begin.</div>
                        )}
                    </div>
                    
                    {selectedProblem?.testCases && selectedProblem.testCases.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Test Cases ({selectedProblem.testCases.length})</h4>
                            <div className="space-y-2">
                                {selectedProblem.testCases.slice(0, 3).map((tc, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono flex flex-col gap-1">
                                        <div className="text-slate-500 font-bold">Input {idx+1}:</div>
                                        <div className="bg-white p-2 rounded whitespace-pre max-h-32 overflow-auto text-[10px]">{tc.input}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-auto p-4 border-t border-slate-200 shrink-0 bg-white z-10">
                  <h3 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Participants ({participants.length})
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {participants.map(p => (
                      <div key={p.userId} className="flex justify-between items-center bg-slate-50/50 p-2 rounded border border-slate-200/50">
                        <span className="text-sm font-medium truncate flex-1" title={p.name}>
                          {p.name} {p.userId === user?.id ? <span className="text-slate-400 text-xs ml-1">(You)</span> : ''}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-2 ${
                          p.role === 'interviewer' ? 'bg-blue-500/10 text-blue-400' :
                          p.role === 'candidate' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-slate-500'
                        }`}>
                          {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full bg-slate-50 min-h-0 relative">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                      No messages yet. Say hi!
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                             {msg.isPrivate && <Lock className="w-3 h-3 text-red-400" title="Private to interviewers" />}
                             {isMe ? 'You' : msg.senderName}
                          </span>
                          <div className={`px-3 py-2 rounded-lg max-w-[90%] text-sm ${
                            msg.isPrivate ? 'bg-red-50 text-red-900 border border-red-200' :
                            isMe ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>
                
                <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                  <form onSubmit={handleSendChat} className="flex flex-col gap-2">
                    {isInterviewer && (
                        <label className="flex items-center gap-2 text-xs text-slate-500 font-bold ml-1 cursor-pointer w-fit">
                           <input type="checkbox" checked={isPrivateChat} onChange={e => setIsPrivateChat(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                           Private msg (Interviewers only)
                        </label>
                    )}
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder={isPrivateChat ? "Type private message..." : "Type a message..."} 
                          className={`flex-1 bg-slate-50 border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 ${isPrivateChat ? 'border-red-200 focus:ring-red-100 placeholder-red-300 text-red-900 bg-red-50' : 'border-slate-200 focus:ring-indigo-100'}`}
                        />
                        <button type="submit" disabled={!chatInput.trim()} className={`text-white p-2 rounded-full transition-colors flex items-center justify-center ${isPrivateChat ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'} disabled:bg-slate-200 disabled:text-slate-400`}>
                          <Send className="w-4 h-4" />
                        </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* DRAG HANDLE */}
        <div 
          className="w-1 hover:w-1.5 bg-slate-200 hover:bg-indigo-400 cursor-col-resize transition-all z-20 shrink-0 border-r border-slate-200"
          onMouseDown={() => {
            isDraggingRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        />

        {/* Center Editor Area */}
        <div className="flex-1 flex flex-col relative bg-white overflow-hidden min-h-0">
          {isSpectator && (
            <div className="absolute top-0 left-0 w-full z-10 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-600 text-sm text-center py-1 flex items-center justify-center gap-2 pointer-events-none backdrop-blur-sm">
              <ShieldAlert className="w-4 h-4" /> You are in read-only spectator mode.
            </div>
          )}
          
          <div className={`flex-1 min-h-0 ${isSpectator ? 'mt-8' : ''}`}>
             {/* Only render Editor when we have room details! */}
             {roomDetails && (
                 <Editor
                    height="100%"
                    language={language}
                    theme="light"
                    onMount={handleEditorMount}
                    options={{
                      readOnly: isSpectator,
                      minimap: { enabled: false },
                      fontSize: 15,
                      wordWrap: 'on',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontLigatures: true,
                      padding: { top: 16 }
                    }}
                 />
             )}
          </div>
          
          {/* Output Panel */}
          {executionResult && (
            <div className="h-64 border-t-2 border-slate-200 bg-slate-50 flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
                <h3 className="font-semibold text-slate-600 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Terminal className="w-4 h-4" /> Terminal Output 
                  {executionResult.testResults ? (
                     <span className={`ml-3 px-2 py-0.5 rounded text-xs font-bold ${executionResult.code === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                       Tests Passed: {executionResult.testResults.filter((t: any) => t.passed).length} / {executionResult.testResults.length}
                     </span>
                  ) : (
                     <span className={`ml-3 px-2 py-0.5 rounded text-xs font-bold ${executionResult.code === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                       Exit Code: {executionResult.code}
                     </span>
                  )}
                </h3>
                <button onClick={clearOutput} className="text-slate-400 hover:text-slate-800 transition-colors hover:bg-slate-200 p-1 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] whitespace-pre-wrap leading-relaxed">
                {executionResult.testResults ? (
                   <div className="space-y-4">
                     {executionResult.testResults.map((tr: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded border ${tr.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                           <div className="font-bold mb-1 flex items-center gap-2">
                             {tr.passed ? <span className="text-emerald-600">✅ Test Case {tr.testCaseIndex} Passed {idx >= 3 ? '(Hidden)' : ''}</span> : <span className="text-red-600">❌ Test Case {tr.testCaseIndex} Failed {idx >= 3 ? '(Hidden)' : ''}</span>}
                           </div>
                           {idx < 3 && (
                             <>
                               <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                                 <div>
                                   <div className="text-slate-500 uppercase font-semibold text-[10px] mb-1">Input (stdin)</div>
                                   <div className="bg-white p-2 border border-slate-200 rounded text-slate-700 min-h-[40px] whitespace-pre max-h-32 overflow-auto">{tr.input}</div>
                                 </div>
                                 <div>
                                   <div className="text-slate-500 uppercase font-semibold text-[10px] mb-1">Expected Output</div>
                                   <div className="bg-white p-2 border border-slate-200 rounded text-slate-700 min-h-[40px] whitespace-pre max-h-32 overflow-auto">{tr.expectedOutput}</div>
                                 </div>
                               </div>
                               {!tr.passed && (
                                 <div className="mt-3 text-xs">
                                   <div className="text-slate-500 uppercase font-semibold text-[10px] mb-1">Actual Output</div>
                                   <div className="bg-white p-2 border border-red-200 rounded text-red-600 min-h-[40px] whitespace-pre max-h-32 overflow-auto">{tr.actualOutput}</div>
                                 </div>
                               )}
                             </>
                           )}
                        </div>
                     ))}
                   </div>
                ) : (
                   <>
                     {executionResult.stdout && <div className="text-slate-600">{executionResult.stdout}</div>}
                     {executionResult.stderr && <div className="text-red-400 mt-2">{executionResult.stderr}</div>}
                     {!executionResult.stdout && !executionResult.stderr && (
                       <div className="text-slate-400 italic">No output generated.</div>
                     )}
                   </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Test Generator Modal */}
      <TestGeneratorModal 
         isOpen={isGeneratorOpen} 
         onClose={() => setIsGeneratorOpen(false)} 
         roomCode={roomCode} 
         problemId={selectedProblemId}
         initialGenerator={selectedProblem?.generatorCode}
         initialValidator={selectedProblem?.validatorCode}
         onGenerated={(updatedProblem: any) => {
             // Update the specific problem in state
             setRoomDetails(prev => {
                 if (!prev) return prev;
                 const newProblems = prev.problems.map(p => p._id === updatedProblem._id ? updatedProblem : p);
                 return { ...prev, problems: newProblems };
             });
         }}
      />
    </div>
  );
};
