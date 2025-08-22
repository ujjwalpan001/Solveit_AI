import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { QuestionProvider } from './context/QuestionContext';
import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import Dashboard from './components/Dashboard';
import QuestionForm from './components/QuestionForm';
import ChatInterface from './components/ChatInterface';
import { useAuth } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <QuestionProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUpForm /></PublicRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/ask" element={<PrivateRoute><QuestionForm /></PrivateRoute>} />
              <Route path="/chat" element={<PrivateRoute><ChatInterface /></PrivateRoute>} />
              <Route path="/" element={<Navigate to="/chat" replace />} />
            </Routes>
          </main>
        </div>
      </QuestionProvider>
    </AuthProvider>
  );
}

// Private route wrapper
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" replace />;
}

// Public route wrapper (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  console.log('PublicRoute render:', { user: !!user, loading });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default App;
