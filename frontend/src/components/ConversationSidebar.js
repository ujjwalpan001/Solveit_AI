import React, { useState } from 'react';
import { useConversations } from '../context/ConversationContext';

const ConversationSidebar = ({ onSelectConversation, selectedConversationId }) => {
  const { 
    conversations, 
    loading, 
    createConversation, 
    deleteConversation,
    updateConversation 
  } = useConversations();

  const [isCreating, setIsCreating] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    subject: 'general',
    title: ''
  });

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const conversation = await createConversation(newConversationData);
      onSelectConversation(conversation);
      setNewConversationData({ subject: 'general', title: '' });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation and all its questions?')) {
      try {
        await deleteConversation(conversationId);
        if (selectedConversationId === conversationId) {
          onSelectConversation(null);
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const subjectColors = {
    math: 'bg-blue-100 text-blue-800',
    science: 'bg-green-100 text-green-800',
    history: 'bg-yellow-100 text-yellow-800',
    coding: 'bg-purple-100 text-purple-800',
    general: 'bg-gray-100 text-gray-800'
  };

  const subjectIcons = {
    math: '🔢',
    science: '🧪',
    history: '📚',
    coding: '💻',
    general: '💭'
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
      </div>

      {/* New Conversation Form */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleCreateConversation} className="space-y-3">
          <div>
            <select
              value={newConversationData.subject}
              onChange={(e) => setNewConversationData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">💭 General</option>
              <option value="math">🔢 Mathematics</option>
              <option value="science">🧪 Science</option>
              <option value="history">📚 History</option>
              <option value="coding">💻 Programming</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Conversation title (optional)"
              value={newConversationData.title}
              onChange={(e) => setNewConversationData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {isCreating ? 'Creating...' : '+ New Conversation'}
          </button>
        </form>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Create your first conversation above</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation(conversation)}
                className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 group ${
                  selectedConversationId === conversation._id
                    ? 'bg-blue-50 border-blue-200 border'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{subjectIcons[conversation.subject]}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${subjectColors[conversation.subject]}`}>
                        {conversation.subject}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.title || `${conversation.subject} conversation`}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {conversation.questionCount} question{conversation.questionCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(conversation.lastActivityAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conversation._id, e)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-red-100 rounded text-red-600 transition-all"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
