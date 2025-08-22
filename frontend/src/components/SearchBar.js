import React, { useState } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import { Search, Filter, Calendar } from 'lucide-react';

function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const { searchQuestions, loading } = useQuestions();

  const subjects = [
    { value: 'all', label: 'All Subjects' },
    { value: 'math', label: 'Mathematics' },
    { value: 'science', label: 'Science' },
    { value: 'history', label: 'History' },
    { value: 'coding', label: 'Programming' },
    { value: 'general', label: 'General' }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    
    const searchParams = {
      query: searchQuery,
      subject: subject === 'all' ? undefined : subject,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined
    };

    // Remove undefined values
    Object.keys(searchParams).forEach(key => {
      if (searchParams[key] === undefined) {
        delete searchParams[key];
      }
    });

    await searchQuestions(searchParams);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSubject('all');
    setDateRange({ startDate: '', endDate: '' });
    setShowFilters(false);
    searchQuestions({});
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your questions..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 border rounded-md transition-colors ${
            showFilters
              ? 'border-primary-500 text-primary-600 bg-primary-50'
              : 'border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-5 w-5" />
        </button>
        
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <div className="loading-spinner w-4 h-4"></div>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {subjects.map((subj) => (
                  <option key={subj.value} value={subj.value}>
                    {subj.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Use filters to narrow down your search results
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
