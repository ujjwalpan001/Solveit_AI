import React, { useState, useRef, useEffect } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../context/ConversationContext';
import ConversationSidebar from './ConversationSidebar';
import { toast } from 'react-toastify';
import { InlineMath, BlockMath } from 'react-katex';
import { 
  Send, 
  Bot, 
  User, 
  Video, 
  Download,
  Sparkles,
  BookOpen,
  Trash2,
  Copy,
  Check,
  Menu,
  PanelLeftClose
} from 'lucide-react';

function ChatInterface() {
  const { currentConversation, setCurrentConversation, getConversationWithQuestions } = useConversations();
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your AI tutor. I can help you with math, science, programming, history, and many other topics. Just ask me anything!",
      timestamp: new Date(),
      subject: 'general'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('general');
  const [generateVideo, setGenerateVideo] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [videoPolling, setVideoPolling] = useState(new Set());
  const [showSidebar, setShowSidebar] = useState(true);
  const { askQuestion, generateVideo: generateVideoForQuestion, loading } = useQuestions();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Handle conversation selection
  const handleSelectConversation = async (conversation) => {
    setCurrentConversation(conversation);
    
    if (conversation) {
      try {
        const data = await getConversationWithQuestions(conversation._id);
        const conversationMessages = data.questions?.map(q => ([
          {
            id: `q-${q._id}`,
            questionId: q._id,
            type: 'user',
            content: q.question,
            timestamp: new Date(q.createdAt),
            subject: q.subject
          },
          {
            id: `a-${q._id}`,
            questionId: q._id,
            type: 'bot',
            content: q.answer.text || 'No answer available',
            steps: q.answer.steps,
            timestamp: new Date(q.createdAt),
            subject: q.subject,
            status: q.status,
            videoPath: q.videoPath
          }
        ])).flat() || [];
        
        setMessages([
          {
            id: 1,
            type: 'bot',
            content: "Hello! I'm your AI tutor. I can help you with math, science, programming, history, and many other topics. Just ask me anything!",
            timestamp: new Date(),
            subject: 'general'
          },
          ...conversationMessages
        ]);
        
        setSelectedSubject(conversation.subject);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        toast.error('Failed to load conversation');
      }
    } else {
      // Reset to default welcome message
      setMessages([
        {
          id: 1,
          type: 'bot',
          content: "Hello! I'm your AI tutor. I can help you with math, science, programming, history, and many other topics. Just ask me anything!",
          timestamp: new Date(),
          subject: 'general'
        }
      ]);
    }
  };
  const textareaRef = useRef(null);

  const subjects = [
    { value: 'math', label: 'Math', icon: '📊', color: 'bg-blue-100 text-blue-800' },
    { value: 'science', label: 'Science', icon: '🔬', color: 'bg-green-100 text-green-800' },
    { value: 'history', label: 'History', icon: '📚', color: 'bg-purple-100 text-purple-800' },
    { value: 'coding', label: 'Code', icon: '💻', color: 'bg-orange-100 text-orange-800' },
    { value: 'general', label: 'General', icon: '🤔', color: 'bg-gray-100 text-gray-800' }
  ];

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for video completion
  useEffect(() => {
    const pollVideos = async () => {
      const processingMessages = messages.filter(msg => 
        msg.status === 'processing' && msg.questionId && !videoPolling.has(msg.questionId)
      );

      processingMessages.forEach(async (msg) => {
        setVideoPolling(prev => new Set(prev.add(msg.questionId)));
        
        const checkVideo = async () => {
          try {
            console.log(`🔍 Polling video status for question: ${msg.questionId}`);
            const response = await fetch(`/api/questions/${msg.questionId}/status`);
            const data = await response.json();
            console.log(`📊 Poll response for ${msg.questionId}:`, data);
            
            if (data.success) {
              const question = data.data?.question || data.question; // Handle both formats
              if (question.status === 'completed' && question.videoPath) {
                console.log(`✅ Video completed for ${msg.questionId}:`, question.videoPath);
                // Update message with video
                setMessages(prev => prev.map(m => 
                  m.questionId === msg.questionId 
                    ? { ...m, status: 'completed', videoPath: question.videoPath }
                    : m
                ));
                setVideoPolling(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(msg.questionId);
                  return newSet;
                });
              } else if (question.status === 'failed') {
                console.log(`❌ Video failed for ${msg.questionId}`);
                // Update message with error
                setMessages(prev => prev.map(m => 
                  m.questionId === msg.questionId 
                    ? { ...m, status: 'failed' }
                    : m
                ));
                setVideoPolling(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(msg.questionId);
                  return newSet;
                });
              } else {
                console.log(`⏳ Video still processing for ${msg.questionId}, status: ${question.status}`);
              }
            } else {
              console.error(`❌ Failed to get status for ${msg.questionId}:`, data.message);
            }
          } catch (error) {
            console.error('Error checking video status:', error);
          }
        };

        // Check immediately, then every 3 seconds
        checkVideo();
        const interval = setInterval(checkVideo, 3000);
        
        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(interval);
          setVideoPolling(prev => {
            const newSet = new Set(prev);
            newSet.delete(msg.questionId);
            return newSet;
          });
        }, 120000);
      });
    };

    if (messages.some(msg => msg.status === 'processing')) {
      pollVideos();
    }
  }, [messages, videoPolling]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      subject: selectedSubject
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Add loading message
    const loadingMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: 'Thinking...',
      timestamp: new Date(),
      loading: true,
      subject: selectedSubject
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      const result = await askQuestion({
        question: inputMessage,
        subject: selectedSubject,
        conversationId: currentConversation?._id,
        generateVideo
      });

      console.log('Chat result:', result); // Debug log
      console.log('Chat result success:', result.success);
      console.log('Chat result question:', result.question);
      console.log('Chat result data:', result.data);

      if (result.success && result.question && result.question.answer) {
        const botMessage = {
          id: Date.now() + 2,
          type: 'bot',
          content: result.question.answer.text || 'No response received',
          timestamp: new Date(),
          subject: selectedSubject,
          questionId: result.question._id,
          videoRequested: generateVideo,
          status: generateVideo ? 'processing' : result.question.status,
          videoPath: result.question.videoPath || null
        };

        // Remove loading message and add bot response
        setMessages(prev => prev.slice(0, -1).concat(botMessage));

        if (generateVideo) {
          toast.success('Answer generated! Video creation started.');
        }
      } else {
        console.error('Chat error:', result); // Debug log
        const errorMessage = {
          id: Date.now() + 2,
          type: 'bot',
          content: `Sorry, I encountered an error: ${result.error || 'Unknown error'}`,
          timestamp: new Date(),
          error: true
        };

        setMessages(prev => prev.slice(0, -1).concat(errorMessage));
        toast.error(result.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Chat exception:', error); // Debug log
      const errorMessage = {
        id: Date.now() + 2,
        type: 'bot',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
        error: true
      };

      setMessages(prev => prev.slice(0, -1).concat(errorMessage));
      toast.error('Failed to get response');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGenerateVideo = async (questionId) => {
    const result = await generateVideoForQuestion(questionId);
    if (result.success) {
      toast.success('Video generation started!');
      // Update message status
      setMessages(prev => prev.map(msg => 
        msg.questionId === questionId 
          ? { ...msg, status: 'processing' }
          : msg
      ));
    } else {
      toast.error(result.error);
    }
  };

  const copyToClipboard = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: "Chat cleared! How can I help you today?",
        timestamp: new Date(),
        subject: 'general'
      }
    ]);
  };

  // Function to render text with KaTeX support for $ and $$ syntax
  const renderTextWithKaTeX = (text) => {
    if (!text) return null;

    // Split by display math first ($$...$$)
    const parts = text.split(/(\$\$[\s\S]*?\$\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Display math
        const math = part.slice(2, -2).trim();
        return <BlockMath key={index} math={math} />;
      } else {
        // Process inline math ($...$) in the remaining text
        const inlineParts = part.split(/(\$[^$\n]+?\$)/g);
        return inlineParts.map((inlinePart, inlineIndex) => {
          if (inlinePart.startsWith('$') && inlinePart.endsWith('$') && inlinePart.length > 2) {
            // Inline math
            const math = inlinePart.slice(1, -1);
            return <InlineMath key={`${index}-${inlineIndex}`} math={math} />;
          } else {
            // Regular text - preserve line breaks
            return inlinePart.split('\n').map((line, lineIndex) => (
              <React.Fragment key={`${index}-${inlineIndex}-${lineIndex}`}>
                {line}
                {lineIndex < inlinePart.split('\n').length - 1 && <br />}
              </React.Fragment>
            ));
          }
        });
      }
    });
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    const subject = subjects.find(s => s.value === message.subject) || subjects[4];

    if (message.loading) {
      return (
        <div className="flex items-start space-x-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-start space-x-3 mb-6 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-green-600' : message.error ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {isUser ? <User className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
        </div>

        <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : ''}`}>
          {/* Subject tag */}
          <div className={`inline-flex items-center space-x-1 text-xs px-2 py-1 rounded-full mb-2 ${subject.color}`}>
            <span>{subject.icon}</span>
            <span>{subject.label}</span>
          </div>

          {/* Message content */}
          <div className={`rounded-lg p-4 ${
            isUser 
              ? 'bg-green-600 text-white ml-12' 
              : message.error 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-gray-100'
          }`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">
                  {renderTextWithKaTeX(message.content)}
                </div>

                {/* Video section */}
                {message.videoRequested && (
                  <div className="mt-4 border-t pt-4">
                    {message.status === 'processing' && (
                      <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-600 border-t-transparent"></div>
                        <div>
                          <div className="font-medium text-yellow-800">Creating video explanation...</div>
                          <div className="text-sm text-yellow-600">This may take up to 2 minutes</div>
                        </div>
                      </div>
                    )}
                    
                    {message.status === 'completed' && message.videoPath && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Video className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium text-gray-900">Video Explanation</h4>
                        </div>
                        <video 
                          controls 
                          className="w-full max-w-2xl rounded-lg shadow-sm"
                          preload="metadata"
                        >
                          <source src={`http://localhost:5000${message.videoPath}`} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                          <span>Generated using Manim mathematical animations</span>
                          <a 
                            href={`http://localhost:5000${message.videoPath}`} 
                            download
                            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {message.status === 'failed' && (
                      <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-red-600">
                          <Video className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-medium text-red-800">Video generation failed</div>
                          <div className="text-sm text-red-600">Unable to create video explanation</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message actions */}
          {!isUser && !message.error && (
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={() => copyToClipboard(message.content, message.id)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded"
                title="Copy response"
              >
                {copiedId === message.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>

              {message.questionId && !message.videoRequested && (
                <button
                  onClick={() => handleGenerateVideo(message.questionId)}
                  className="text-purple-600 hover:text-purple-700 p-1 rounded"
                  title="Generate video"
                >
                  <Video className="h-4 w-4" />
                </button>
              )}

              <span className="text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          )}

          {isUser && (
            <div className="mt-2 mr-12">
              <span className="text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex">
      {/* Conversation Sidebar */}
      {showSidebar && (
        <ConversationSidebar
          onSelectConversation={handleSelectConversation}
          selectedConversationId={currentConversation?._id}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Show conversations"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentConversation ? currentConversation.title : 'AI Tutor Chat'}
              </h1>
              <p className="text-sm text-gray-500">
                {currentConversation 
                  ? `${currentConversation.questionCount} questions in this conversation`
                  : 'Ask anything, get detailed explanations'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {showSidebar && (
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Hide conversations"
              >
                <PanelLeftClose className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={clearChat}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Clear chat"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <div key={message.id}>
              {renderMessage(message)}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Subject selector */}
          <div className="flex items-center space-x-2 mb-3">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Subject:</span>
            <div className="flex space-x-1">
              {subjects.map((subject) => (
                <button
                  key={subject.value}
                  onClick={() => setSelectedSubject(subject.value)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedSubject === subject.value
                      ? subject.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{subject.icon}</span>
                  {subject.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video option */}
          <div className="flex items-center space-x-2 mb-3">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={generateVideo}
                onChange={(e) => setGenerateVideo(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Video className="h-4 w-4" />
              <span>Generate video explanation</span>
            </label>
          </div>

          {/* Input */}
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ minHeight: '50px', maxHeight: '200px' }}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* User preferences */}
          {user?.preferences && (
            <div className="mt-3 text-xs text-gray-500 flex items-center space-x-4">
              <span>Language: {user.preferences.language === 'en' ? 'English' : 'Hindi'}</span>
              <span>Voice: {user.preferences.voice === 'male' ? 'Male' : 'Female'}</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default ChatInterface;
