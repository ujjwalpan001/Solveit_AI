import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QuestionProvider } from './context/QuestionContext';
import { ConversationProvider } from './context/ConversationContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import QuestionForm from './components/QuestionForm';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <ConversationProvider>
      <QuestionProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ask" element={<QuestionForm />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/" element={<Navigate to="/chat" replace />} />
            </Routes>
          </main>
        </div>
      </QuestionProvider>
    </ConversationProvider>
  );
}

export default App;
