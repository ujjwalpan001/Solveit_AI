import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ConversationContext = createContext();

export const useConversations = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
};

export const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch conversations
  const fetchConversations = async (params = {}) => {
    try {
      setLoading(true);
      const response = await api.get('/conversations', { params });
      if (response.data.success) {
        setConversations(response.data.data.conversations);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  // Create new conversation
  const createConversation = async (data) => {
    try {
      setLoading(true);
      const response = await api.post('/conversations', data);
      if (response.data.success) {
        const newConversation = response.data.data.conversation;
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        return newConversation;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get conversation with questions
  const getConversationWithQuestions = async (conversationId, params = {}) => {
    try {
      setLoading(true);
      const response = await api.get(`/conversations/${conversationId}`, { 
        params: { includeQuestions: true, ...params } 
      });
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update conversation
  const updateConversation = async (conversationId, data) => {
    try {
      setLoading(true);
      const response = await api.put(`/conversations/${conversationId}`, data);
      if (response.data.success) {
        const updatedConversation = response.data.data.conversation;
        setConversations(prev => 
          prev.map(conv => 
            conv._id === conversationId ? updatedConversation : conv
          )
        );
        if (currentConversation?._id === conversationId) {
          setCurrentConversation(updatedConversation);
        }
        return updatedConversation;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      setLoading(true);
      const response = await api.delete(`/conversations/${conversationId}`);
      if (response.data.success) {
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        if (currentConversation?._id === conversationId) {
          setCurrentConversation(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const value = {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    error,
    setError,
    fetchConversations,
    createConversation,
    getConversationWithQuestions,
    updateConversation,
    deleteConversation
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};
