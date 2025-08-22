import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import SearchBar from './SearchBar';
import HistoryList from './HistoryList';
import VideoPlayer from './VideoPlayer';
import { 
  MessageSquare, 
  BookOpen, 
  Video, 
  Clock, 
  TrendingUp,
  BarChart3
} from 'lucide-react';

function Dashboard() {
  const { 
    questions, 
    dashboardStats, 
    loading, 
    getQuestions, 
    getDashboardStats 
  } = useQuestions();
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    getQuestions({ limit: 10 });
    getDashboardStats();
  }, []);

  const handleVideoPlay = (question) => {
    setSelectedQuestion(question);
    setShowVideoPlayer(true);
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
            Welcome to AI Tutor! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Ready to learn something new today?
          </p>
        </div>
        <div className="flex items-center space-x-3">
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


    </div>
  );
}

export default Dashboard;
