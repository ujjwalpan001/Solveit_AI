import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { toast } from 'react-toastify';
import { MessageSquare, Video, FileText } from 'lucide-react';

function QuestionForm() {
  const [formData, setFormData] = useState({
    question: '',
    subject: 'general',
    generateVideo: false
  });
  const { askQuestion, loading } = useQuestions();
  const navigate = useNavigate();

  const subjects = [
    { value: 'math', label: 'Mathematics', icon: '📊' },
    { value: 'science', label: 'Science', icon: '🔬' },
    { value: 'history', label: 'History', icon: '📚' },
    { value: 'coding', label: 'Programming', icon: '💻' },
    { value: 'general', label: 'General', icon: '🤔' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (formData.question.trim().length < 5) {
      toast.error('Question must be at least 5 characters long');
      return;
    }

    const result = await askQuestion(formData);
    
    if (result.success) {
      toast.success(
        formData.generateVideo 
          ? 'Question submitted! Video generation started.' 
          : 'Question answered successfully!'
      );
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <MessageSquare className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Ask a Question</h2>
          <p className="text-gray-600 mt-2">
            Get detailed explanations with optional video tutorials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-3">
              Subject Category
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {subjects.map((subject) => (
                <label
                  key={subject.value}
                  className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-colors ${
                    formData.subject === subject.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="subject"
                    value={subject.value}
                    checked={formData.subject === subject.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">{subject.icon}</div>
                  <div className="text-sm font-medium">{subject.label}</div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              id="question"
              name="question"
              rows={6}
              value={formData.question}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 resize-vertical"
              placeholder="Ask anything... For example:
• Solve: 2x + 5 = 13
• Explain photosynthesis process
• What caused World War I?
• How to implement a binary search algorithm?
• What is the meaning of life?"
            />
            <div className="mt-1 text-sm text-gray-500">
              {formData.question.length} characters
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Output Options</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Text Solution (Always included)</div>
                  <div className="text-sm text-gray-600">
                    Step-by-step explanation with math rendering and syntax highlighting
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex items-center">
                  <input
                    id="generateVideo"
                    name="generateVideo"
                    type="checkbox"
                    checked={formData.generateVideo}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </div>
                <label htmlFor="generateVideo" className="cursor-pointer flex-1">
                  <div className="flex items-start space-x-3">
                    <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Video Explanation (Optional)</div>
                      <div className="text-sm text-gray-600">
                        Animated video with voice narration (takes a few minutes to generate)
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Default Preferences</h4>
            <div className="text-sm text-blue-700">
              <div>Language: English</div>
              <div>Voice: Female</div>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              These are the default settings for video generation
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.question.trim()}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="loading-spinner w-4 h-4"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                'Get Answer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuestionForm;
