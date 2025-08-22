import axios from 'axios';
import { getToken, removeToken } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
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
