import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';
import SearchBar from './SearchBar';
import HistoryList from './HistoryList';
import VideoPlayer from './VideoPlayer';
import { 
  MessageSquare, 
  BookOpen, 
  Video, 
  Clock, 
  TrendingUp,
  BarChart3,
  Settings
} from 'lucide-react';

function Dashboard() {
  const { 
    questions, 
    dashboardStats, 
    loading, 
    getQuestions, 
    getDashboardStats 
  } = useQuestions();
  const { user, updateProfile } = useAuth();
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    language: user?.preferences?.language || 'en',
    voice: user?.preferences?.voice || 'female'
  });

  useEffect(() => {
    getQuestions({ limit: 10 });
    getDashboardStats();
  }, []);

  const handleVideoPlay = (question) => {
    setSelectedQuestion(question);
    setShowVideoPlayer(true);
  };

  const handlePreferencesUpdate = async () => {
    const result = await updateProfile({ preferences });
    if (result.success) {
      setShowSettings(false);
      toast.success('Preferences updated successfully!');
    } else {
      toast.error(result.error);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm font-medium text-gray-600">{title}</div>
          {subtitle && (
            <div className="text-xs text-gray-500">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Ready to learn something new today?
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          <Link
            to="/ask"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Ask Question</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={BookOpen}
            title="Total Questions"
            value={dashboardStats.totalQuestions || 0}
            color="bg-blue-500"
          />
          <StatCard
            icon={Clock}
            title="This Week"
            value={dashboardStats.recentQuestions || 0}
            subtitle="Last 7 days"
            color="bg-green-500"
          />
          <StatCard
            icon={Video}
            title="Videos Created"
            value={dashboardStats.videoStats?.totalWithVideos || 0}
            color="bg-purple-500"
          />
          <StatCard
            icon={TrendingUp}
            title="Processing"
            value={dashboardStats.videoStats?.processing || 0}
            subtitle="Videos in queue"
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Subject Distribution */}
      {dashboardStats?.questionsBySubject && Object.keys(dashboardStats.questionsBySubject).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Questions by Subject</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(dashboardStats.questionsBySubject).map(([subject, count]) => (
              <div key={subject} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{subject}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <SearchBar />
      </div>

      {/* Recent Questions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Questions</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner"></div>
            </div>
          ) : questions && questions.length > 0 ? (
            <HistoryList 
              questions={questions} 
              onVideoPlay={handleVideoPlay}
            />
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No questions yet!</p>
              <Link
                to="/ask"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Ask Your First Question
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && selectedQuestion && (
        <VideoPlayer
          question={selectedQuestion}
          onClose={() => setShowVideoPlayer(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice
                </label>
                <select
                  value={preferences.voice}
                  onChange={(e) => setPreferences(prev => ({ ...prev, voice: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreferencesUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
