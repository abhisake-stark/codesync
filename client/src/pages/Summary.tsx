import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, ArrowLeft, Terminal } from 'lucide-react';
import Editor from '@monaco-editor/react';

export const Summary: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/sessions/${roomId}`)
      .then(res => setSession(res.data))
      .catch(() => {
        alert('Failed to load session summary');
        navigate('/dashboard');
      });
  }, [roomId, navigate]);

  if (!session) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading...</div>;
  }

  const { roomCode, problemStatement, language } = session.roomId;
  const { rating, verdict, notes } = session.feedback;

  const verdictColors = {
    'hire': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'undecided': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    'no-hire': 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 p-4 px-8 flex justify-between items-center shadow-lg z-10">
        <h1 className="font-bold text-xl text-white">Interview Summary</h1>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Feedback Details) */}
        <div className="w-96 bg-gray-900 border-r border-gray-800 overflow-y-auto p-8 flex flex-col gap-8 shadow-xl z-0">
          
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Room Code</h2>
            <div className="font-mono text-xl text-blue-400">{roomCode}</div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Final Verdict</h2>
            <div className={`inline-block px-4 py-2 rounded-lg font-bold border capitalize ${verdictColors[verdict as keyof typeof verdictColors]}`}>
              {verdict.replace('-', ' ')}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Rating</h2>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={`w-6 h-6 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'fill-transparent text-gray-700'}`} 
                />
              ))}
            </div>
          </div>

          {notes && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h2>
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {notes}
              </div>
            </div>
          )}
          
          {problemStatement && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Challenge</h2>
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {problemStatement}
              </div>
            </div>
          )}

        </div>

        {/* Right Editor Area (Code Snapshot) */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <div className="bg-[#1a1a1a] border-b border-gray-800 py-2 px-4 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Final Code Snapshot ({language})</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={session.codeSnapshot}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                padding: { top: 16 }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
