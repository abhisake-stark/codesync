import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Users, Code2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [joinRoomCode, setJoinRoomCode] = useState('');

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const input = joinRoomCode.trim();
    if (input) {
      let code = input;
      if (input.includes('/room/')) {
        code = input.split('/room/').pop() || input;
      }
      navigate(`/room/${code}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-4 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-2">
          <img src="/logo.png" alt="CodeSync" className="w-48 h-auto object-contain" />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="text-center mb-4 space-y-2">
          <h2 className="text-5xl font-extrabold text-slate-800 tracking-tight">
            Welcome back, <span className="text-indigo-600">{user?.username}</span>
          </h2>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            Ready for your next technical interview? Join an existing session or start a new one.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Join Room Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-indigo-100 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Join a Room</h3>
            </div>
            <p className="text-slate-500 mb-4 font-medium">
              Enter an existing room code provided by your interviewer.
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. swift-tiger-42"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
              <button 
                type="submit"
                disabled={!joinRoomCode.trim()}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-semibold text-lg transition-all shadow-md hover:shadow-xl"
              >
                Join Room
              </button>
            </form>
          </div>

          {/* Create Room Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-indigo-100 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Create a Room</h3>
            </div>
            <p className="text-slate-500 mb-4 font-medium">
              Host a new technical interview session and invite candidates to collaborate.
            </p>
            <button 
              onClick={() => navigate('/room-setup')}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-semibold text-lg transition-colors mt-auto shadow-sm"
            >
              <Plus className="w-5 h-5" /> Start New Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
