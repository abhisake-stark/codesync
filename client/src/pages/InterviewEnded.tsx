import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Home, CheckCircle } from 'lucide-react';

export const InterviewEnded: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="bg-slate-800 p-10 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-700 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
        
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-indigo-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Interview Concluded</h1>
        <p className="text-slate-400 mb-8">
          The session for room <strong className="text-slate-200">{roomCode}</strong> has been ended by the interviewer.
        </p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => navigate(`/replay/${roomCode}`)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" /> Watch Replay
          </button>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-xl font-bold transition-all active:scale-95"
          >
            <Home className="w-5 h-5" /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
