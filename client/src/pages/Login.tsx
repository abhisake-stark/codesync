import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] font-sans">
      <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        <div className="flex justify-center mb-6"><img src="/logo.png" alt="CodeSync" className="w-56 h-auto object-contain" /></div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome Back</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">Sign in to continue to CodeSync.</p>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-2xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              placeholder="Email address"
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium" 
            />
          </div>
          <div>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              placeholder="Password"
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 px-4 rounded-full transition-colors disabled:opacity-70 mt-4"
          >
            {isSubmitting ? 'Signing in...' : 'Log In'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-slate-500 text-sm font-medium">
          Don't have an account? <Link to="/signup" className="text-indigo-500 hover:text-indigo-600">Sign up</Link>
        </p>
      </div>
    </div>
  );
};
