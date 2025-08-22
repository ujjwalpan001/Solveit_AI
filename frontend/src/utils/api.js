import axios from 'axios';

// Hardcode the API URL directly to fix the 404 issue
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auth API (kept for potential future use)
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (updates) => api.put('/auth/profile', updates)
};

// Question API
export const questionAPI = {
  askQuestion: (questionData) => api.post('/questions', questionData),
  getQuestions: (params) => api.get('/questions', { params }),
  getQuestion: (id) => api.get(`/questions/${id}`),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
  generateVideo: (id) => api.post(`/questions/${id}/generate-video`)
};

// User API
export const userAPI = {
  getDashboardStats: () => api.get('/users/dashboard/stats'),
  searchQuestions: (params) => api.get('/users/search', { params })
};

export default api;
