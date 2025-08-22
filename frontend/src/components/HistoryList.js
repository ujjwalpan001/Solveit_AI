import React from 'react';
import { useQuestions } from '../hooks/useQuestions';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { InlineMath, BlockMath } from 'react-katex';
import { 
  Video, 
  FileText, 
  Trash2, 
  Clock, 
  PlayCircle, 
  Download,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { toast } from 'react-toastify';

function HistoryList({ questions, onVideoPlay }) {
  const { deleteQuestion, generateVideo, loading } = useQuestions();

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      const result = await deleteQuestion(id);
      if (result.success) {
        toast.success('Question deleted successfully');
      } else {
        toast.error(result.error);
      }
    }
  };

  const handleGenerateVideo = async (id) => {
    const result = await generateVideo(id);
    if (result.success) {
      toast.success('Video generation started! This may take a few minutes.');
    } else {
      toast.error(result.error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubjectIcon = (subject) => {
    const icons = {
      math: '📊',
      science: '🔬',
      history: '📚',
      coding: '💻',
      general: '🤔'
    };
    return icons[subject] || '🤔';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-600',
      processing: 'text-yellow-600',
      failed: 'text-red-600',
      pending: 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: CheckCircle,
      processing: Loader,
      failed: AlertCircle,
      pending: Clock
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const renderAnswer = (answer) => {
    if (!answer) {
      return <div className="text-gray-500 italic">No answer available</div>;
    }

    if (answer.steps && answer.steps.length > 0) {
      return (
        <div className="space-y-3">
          {answer.steps.map((step, index) => (
            <div key={index} className="prose prose-sm max-w-none">
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
                        // Check if it's a math expression
                        const text = children[0];
                        if (typeof text === 'string' && (text.includes('=') || text.includes('^') || text.includes('_'))) {
                          return <InlineMath math={text} />;
                        }
                        return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
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
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            code: ({ inline, children, ...props }) => {
              if (inline) {
                const text = children[0];
                if (typeof text === 'string' && (text.includes('=') || text.includes('^') || text.includes('_'))) {
                  return <InlineMath math={text} />;
                }
                return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
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
          {answer.text || 'No text available'}
        </ReactMarkdown>
      </div>
    );
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No questions found. Try adjusting your search filters.
      </div>
    );
  }

  // Filter out any undefined or invalid questions
  const validQuestions = questions.filter(question => 
    question && 
    question._id && 
    question.question && 
    question.subject && 
    question.answer
  );

  if (validQuestions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No valid questions found. Try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {validQuestions.map((question) => (
        <div key={question._id} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Question Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{getSubjectIcon(question.subject || 'general')}</span>
                  <span className="text-sm font-medium text-gray-600 capitalize">
                    {question.subject || 'general'}
                  </span>
                  <div className={`flex items-center space-x-1 text-sm ${getStatusColor(question.status || 'pending')}`}>
                    {getStatusIcon(question.status || 'pending')}
                    <span className="capitalize">{question.status || 'pending'}</span>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {question.question || 'No question text'}
                </h3>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(question.createdAt || new Date().toISOString())}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                {question.videoPath ? (
                  <button
                    onClick={() => onVideoPlay(question)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Play Video"
                  >
                    <PlayCircle className="h-5 w-5" />
                  </button>
                ) : (question.status === 'completed' || question.status === 'pending') ? (
                  <button
                    onClick={() => handleGenerateVideo(question._id)}
                    disabled={loading}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
                    title="Generate Video"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                ) : null}
                
                {question.answer && question.answer.text && (
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(question.answer.text)}`}
                    download={`question-${question._id}.txt`}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Download Text"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                )}
                
                <button
                  onClick={() => handleDelete(question._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Question"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Answer Content */}
          <div className="px-6 py-4">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Solution</span>
            </div>
            <div className="bg-white">
              {question.answer ? (
                renderAnswer(question.answer)
              ) : (
                <div className="text-gray-500 italic">No answer available</div>
              )}
            </div>
          </div>

          {/* Video Status */}
          {question.status === 'processing' && (
            <div className="bg-yellow-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-yellow-700">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm">Video is being generated...</span>
              </div>
            </div>
          )}
          
          {question.status === 'failed' && (
            <div className="bg-red-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Video generation failed. Try again later.</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default HistoryList;
