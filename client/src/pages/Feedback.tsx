import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Star, FileText, CheckCircle } from 'lucide-react';

export const Feedback: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const codeSnapshot = location.state?.codeSnapshot || '';

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [verdict, setVerdict] = useState<'hire' | 'no-hire' | 'undecided'>('undecided');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/feedback`, {
        rating,
        verdict,
        notes,
        codeSnapshot
      });
      navigate(`/summary/${res.data.roomId}`);
    } catch (error) {
      alert('Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-gray-200">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Interview Complete</h1>
          <p className="text-gray-400">Please provide your feedback for room <span className="font-mono text-blue-400">{roomCode}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Rating */}
          <div className="flex flex-col items-center">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Overall Performance</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoverRating || rating) 
                        ? 'fill-yellow-500 text-yellow-500' 
                        : 'fill-transparent text-gray-700'
                    }`} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Verdict */}
          <div>
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 block">Final Verdict</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'hire', label: 'Hire', color: 'emerald' },
                { value: 'undecided', label: 'Undecided', color: 'yellow' },
                { value: 'no-hire', label: 'No Hire', color: 'red' }
              ].map((v) => (
                <button
                  type="button"
                  key={v.value}
                  onClick={() => setVerdict(v.value as any)}
                  className={`py-3 rounded-lg font-bold border-2 transition-all ${
                    verdict === v.value
                      ? `border-${v.color}-500 bg-${v.color}-500/10 text-${v.color}-400`
                      : 'border-gray-800 bg-gray-950 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Interview Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down strengths, weaknesses, and observations..."
              className="w-full h-32 bg-gray-950 border border-gray-800 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <CheckCircle className="w-5 h-5" /> Submit Feedback
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
