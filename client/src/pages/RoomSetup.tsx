import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Loader2, ArrowRight, ArrowLeft, Copy, Check } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' }
];

export const RoomSetup: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('javascript');
  const [problems, setProblems] = useState([{ title: '', statement: '' }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roomData, setRoomData] = useState<{ interviewerCode: string, candidateCode: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<'interviewer' | 'candidate' | null>(null);

  const addProblem = () => {
    setProblems([...problems, { title: '', statement: '' }]);
  };

  const removeProblem = (index: number) => {
    if (problems.length === 1) return;
    setProblems(problems.filter((_, i) => i !== index));
  };

  const updateProblem = (index: number, field: 'title' | 'statement', value: string) => {
    const newProblems = [...problems];
    newProblems[index][field] = value;
    setProblems(newProblems);
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rooms`, {
        language,
        problems: problems.filter(p => p.title.trim() || p.statement.trim()) // filter out completely empty ones
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      
      setRoomData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create room');
    } finally {
      setIsGenerating(false);
    }
  };

  if (roomData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Room Created Successfully!</h2>
          <p className="text-slate-500 mb-8">Share the candidate link and join using your interviewer link.</p>
          
          <div className="space-y-4 mb-8 text-left">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Your Link (Interviewer)</label>
              <div className="font-mono text-sm break-all text-indigo-600 font-medium flex items-center justify-between">
                <span>{window.location.origin}/room/{roomData.interviewerCode}</span>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/room/' + roomData.interviewerCode); setCopiedLink('interviewer'); setTimeout(() => setCopiedLink(null), 2000); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                  {copiedLink === 'interviewer' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Candidate Link</label>
              <div className="font-mono text-sm break-all text-emerald-600 font-medium flex items-center justify-between">
                <span>{window.location.origin}/room/{roomData.candidateCode}</span>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/room/' + roomData.candidateCode); setCopiedLink('candidate'); setTimeout(() => setCopiedLink(null), 2000); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                  {copiedLink === 'candidate' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate(`/room/${roomData.interviewerCode}`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-full transition-colors flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
          >
            Join Room Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-3xl flex justify-between items-center mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Setup Room</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-3xl mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Room Settings</h2>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Default Language</label>
          <CustomSelect value={language} onChange={setLanguage} options={languageOptions} className="w-64" />
        </div>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-6">
        {problems.map((p, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-700">Problem {idx + 1}</h3>
              {problems.length > 1 && (
                <button onClick={() => removeProblem(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Remove Problem">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Title</label>
                <input 
                  type="text" 
                  value={p.title} 
                  onChange={e => updateProblem(idx, 'title', e.target.value)}
                  placeholder="e.g. Two Sum"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Statement (Markdown supported)</label>
                <textarea 
                  value={p.statement} 
                  onChange={e => updateProblem(idx, 'statement', e.target.value)}
                  placeholder="Describe the coding challenge here..."
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 h-32 resize-y focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-mono text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        <button onClick={addProblem} className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 transition-all">
          <Plus className="w-5 h-5" /> Add Another Problem
        </button>

        <div className="flex justify-end pt-4 pb-10">
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-3.5 rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isGenerating ? 'Generating...' : 'Generate Room Links'}
          </button>
        </div>
      </div>
    </div>
  );
};
