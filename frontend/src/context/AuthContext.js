import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { getToken, setToken, removeToken } from '../utils/auth';

export const AuthContext = createContext();

const initialState = {
  user: null,
  loading: true,
  error: null
};

function authReducer(state, action) {
  console.log('AuthReducer:', action.type, action.payload);
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      console.log('Setting user in state:', action.payload);
      return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on app start
  useEffect(() => {
    console.log('AuthContext: Initial load starting...');
    const token = getToken();
    if (token) {
      console.log('AuthContext: Found existing token, loading user...');
      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('AuthContext: LoadUser timeout, setting loading to false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }, 10000); // 10 second timeout
      
      loadUser().finally(() => {
        clearTimeout(timeoutId);
      });
    } else {
      console.log('AuthContext: No token found, setting loading to false');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadUser = async () => {
    try {
      console.log('AuthContext: loadUser starting...');
      const response = await authAPI.getProfile();
      console.log('AuthContext: loadUser response:', response.data);
      
      if (response.data.success && response.data.data && response.data.data.user) {
        dispatch({ type: 'SET_USER', payload: response.data.data.user });
        console.log('AuthContext: User loaded successfully');
      } else {
        console.error('AuthContext: Invalid profile response structure', response.data);
        removeToken();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('AuthContext: Failed to load user:', error);
      console.error('AuthContext: Error response:', error.response?.data);
      console.error('AuthContext: Error status:', error.response?.status);
      removeToken();
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Login starting...');
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.login(email, password);
      console.log('AuthContext: Login response received:', response.data);
      
      // Check if response has expected structure
      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }
      
      const { data } = response.data;
      if (!data.token) {
        throw new Error('No token received from login');
      }
      
      setToken(data.token);
      console.log('AuthContext: Token set:', data.token.substring(0, 20) + '...');
      
      // Set user directly from login response if available
      if (data.user) {
        console.log('AuthContext: Setting user from login response:', data.user);
        dispatch({ type: 'SET_USER', payload: data.user });
        return { success: true };
      }
      
      // Fallback: Load user profile after setting token
      try {
        console.log('AuthContext: Loading profile...');
        const profileResponse = await authAPI.getProfile();
        console.log('AuthContext: Profile loaded:', profileResponse.data);
        
        if (profileResponse.data.success && profileResponse.data.data.user) {
          dispatch({ type: 'SET_USER', payload: profileResponse.data.data.user });
          console.log('AuthContext: User state updated successfully');
        } else {
          throw new Error('Invalid profile response');
        }
      } catch (profileError) {
        console.error('Failed to load user profile after login:', profileError);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load user profile' });
        return { success: false, error: 'Failed to load user profile' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.register(userData);
      
      const { user, token } = response.data;
      setToken(token);
      dispatch({ type: 'SET_USER', payload: user });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = () => {
    removeToken();
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (updates) => {
    try {
      const response = await authAPI.updateProfile(updates);
      dispatch({ type: 'SET_USER', payload: response.data.user });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: message };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
