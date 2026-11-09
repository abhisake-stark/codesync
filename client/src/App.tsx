import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { RoomSetup } from './pages/RoomSetup';
import { Room } from './pages/Room';
import { Replay } from './pages/Replay';
import { InterviewEnded } from './pages/InterviewEnded';
import { Feedback } from './pages/Feedback';
import { Summary } from './pages/Summary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />\n            <Route path="/room-setup" element={<RoomSetup />} />
        <Route path="/room/:roomCode" element={<Room />} />
        <Route path="/replay/:roomCode" element={<Replay />} />
        <Route path="/room/:roomCode/ended" element={<InterviewEnded />} />
        <Route path="/feedback/:roomCode" element={<Feedback />} />
        <Route path="/summary/:roomId" element={<Summary />} />
      </Route>
    </Routes>
  );
}

export default App;
