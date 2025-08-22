import React, { createContext, useContext, useReducer } from 'react';
import { questionAPI, userAPI } from '../utils/api';

export const QuestionContext = createContext();

const initialState = {
  questions: [],
  currentQuestion: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  dashboardStats: null
};

function questionReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_QUESTIONS':
      return {
        ...state,
        questions: Array.isArray(action.payload.questions) ? action.payload.questions : [],
        pagination: action.payload.pagination || state.pagination,
        loading: false,
        error: null
      };
    case 'ADD_QUESTION':
      return {
        ...state,
        questions: [action.payload, ...(Array.isArray(state.questions) ? state.questions : [])],
        loading: false,
        error: null
      };
    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: Array.isArray(state.questions) 
          ? state.questions.map(q => q._id === action.payload._id ? action.payload : q)
          : [],
        currentQuestion: state.currentQuestion?._id === action.payload._id
          ? action.payload
          : state.currentQuestion,
        loading: false
      };
    case 'DELETE_QUESTION':
      return {
        ...state,
        questions: Array.isArray(state.questions) 
          ? state.questions.filter(q => q._id !== action.payload)
          : [],
        loading: false
      };
    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.payload, loading: false };
    case 'SET_DASHBOARD_STATS':
      return { ...state, dashboardStats: action.payload };
    default:
      return state;
  }
}

export function QuestionProvider({ children }) {
  const [state, dispatch] = useReducer(questionReducer, initialState);

  const askQuestion = async (questionData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('QuestionContext: Sending request with data:', questionData);
      const response = await questionAPI.askQuestion(questionData);
      console.log('QuestionContext: Full response object:', response);
      console.log('QuestionContext: Response status:', response.status);
      console.log('QuestionContext: Response headers:', response.headers);
      console.log('QuestionContext: Response data:', response.data);
      console.log('QuestionContext: Response data type:', typeof response.data);
      console.log('QuestionContext: Response data keys:', Object.keys(response.data || {}));
      console.log('QuestionContext: Response data.question:', response.data?.question);
      console.log('QuestionContext: Response data.data:', response.data?.data);
      console.log('QuestionContext: Response data.data.question:', response.data?.data?.question);
      
      // The backend returns: { success: true, data: { question: {...} } }
      // So we need to access response.data.data.question
      if (response.data && response.data.data && response.data.data.question) {
        const questionData = response.data.data.question;
        dispatch({ type: 'ADD_QUESTION', payload: questionData });
        return { success: true, question: questionData };
      } else {
        console.error('QuestionContext: Invalid response structure');
        console.error('QuestionContext: Expected response.data.data.question but got:', response.data);
        dispatch({ type: 'SET_ERROR', payload: 'Invalid response from server' });
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('QuestionContext: Error in askQuestion:', error);
      console.error('QuestionContext: Error response:', error.response?.data);
      console.error('QuestionContext: Error status:', error.response?.status);
      const message = error.response?.data?.message || error.message || 'Failed to ask question';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const getQuestions = async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await questionAPI.getQuestions(params);
      // Backend returns { success: true, data: { questions: [...], pagination: {...} } }
      dispatch({ type: 'SET_QUESTIONS', payload: response.data.data || response.data });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get questions';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const getQuestion = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await questionAPI.getQuestion(id);
      dispatch({ type: 'SET_CURRENT_QUESTION', payload: response.data.question });
      return { success: true, question: response.data.question };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get question';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const deleteQuestion = async (id) => {
    try {
      await questionAPI.deleteQuestion(id);
      dispatch({ type: 'DELETE_QUESTION', payload: id });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete question';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const generateVideo = async (id) => {
    try {
      const response = await questionAPI.generateVideo(id);
      dispatch({ type: 'UPDATE_QUESTION', payload: response.data.question });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate video';
      return { success: false, error: message };
    }
  };

  const getDashboardStats = async () => {
    try {
      const response = await userAPI.getDashboardStats();
      dispatch({ type: 'SET_DASHBOARD_STATS', payload: response.data });
      return { success: true };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return { success: false };
    }
  };

  const searchQuestions = async (params) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await userAPI.searchQuestions(params);
      dispatch({ type: 'SET_QUESTIONS', payload: response.data });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Search failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const value = {
    ...state,
    askQuestion,
    getQuestions,
    getQuestion,
    deleteQuestion,
    generateVideo,
    getDashboardStats,
    searchQuestions
  };

  return (
    <QuestionContext.Provider value={value}>
      {children}
    </QuestionContext.Provider>
  );
}

export function useQuestions() {
  const context = useContext(QuestionContext);
  if (!context) {
    throw new Error('useQuestions must be used within a QuestionProvider');
  }
  return context;
}
