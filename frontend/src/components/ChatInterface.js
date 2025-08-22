import React, { useState, useRef, useEffect } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  Check
} from 'lucide-react';

function ChatInterface() {
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
  const { askQuestion, generateVideo: generateVideoForQuestion, loading } = useQuestions();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
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
          steps: result.question.answer.steps || [],
          timestamp: new Date(),
          subject: selectedSubject,
          questionId: result.question._id,
          videoRequested: generateVideo,
          status: result.question.status
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
                {message.steps && message.steps.length > 0 ? (
                  <div className="space-y-3">
                    {message.steps.map((step, index) => (
                      <div key={index}>
                        {step.type === 'equation' ? (
                          <div className="my-2">
                            <BlockMath math={step.content || ''} />
                          </div>
                        ) : step.type === 'code' ? (
                          <SyntaxHighlighter
                            language="javascript"
                            style={tomorrow}
                            className="rounded-md text-sm"
                          >
                            {step.content || ''}
                          </SyntaxHighlighter>
                        ) : (
                          <ReactMarkdown
                            components={{
                              code: ({ inline, children, ...props }) => {
                                if (inline) {
                                  const text = children[0];
                                  if (typeof text === 'string' && (text.includes('=') || text.includes('^') || text.includes('_'))) {
                                    return <InlineMath math={text} />;
                                  }
                                  return <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
                                }
                                return (
                                  <SyntaxHighlighter
                                    language="javascript"
                                    style={tomorrow}
                                    className="rounded-md text-sm"
                                  >
                                    {children}
                                  </SyntaxHighlighter>
                                );
                              }
                            }}
                          >
                            {step.content || 'No content available'}
                          </ReactMarkdown>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ReactMarkdown
                    components={{
                      code: ({ inline, children, ...props }) => {
                        if (inline) {
                          const text = children[0];
                          if (typeof text === 'string' && (text.includes('=') || text.includes('^') || text.includes('_'))) {
                            return <InlineMath math={text} />;
                          }
                          return <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
                        }
                        return (
                          <SyntaxHighlighter
                            language="javascript"
                            style={tomorrow}
                            className="rounded-md text-sm"
                          >
                            {children}
                          </SyntaxHighlighter>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
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

              {message.status === 'processing' && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-600 border-t-transparent"></div>
                  <span className="text-xs">Generating video...</span>
                </div>
              )}

              <button
                onClick={() => copyToClipboard(message.content, `download-${message.id}`)}
                className="text-green-600 hover:text-green-700 p-1 rounded"
                title="Download as text"
              >
                <Download className="h-4 w-4" />
              </button>

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
    <div className="max-w-6xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Tutor Chat</h1>
            <p className="text-sm text-gray-500">Ask anything, get detailed explanations</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
  );
}

export default ChatInterface;
