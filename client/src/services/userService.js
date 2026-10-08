import axios from 'axios';

// Use Vite environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔗 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.message);
    console.error('Error details:', error.response?.data);
    return Promise.reject(error);
  }
);

export const userService = {
  // Get all users
  getAllUsers: async () => {
    try {
      console.log('📤 Fetching users...');
      const response = await api.get('/users');
      console.log('📥 Users response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      throw error.response?.data || { message: error.message };
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Create new user
  createUser: async (userData) => {
    try {
      console.log('📤 Creating user:', userData);
      const response = await api.post('/users', userData);
      console.log('📥 Create response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error in createUser:', error);
      throw error.response?.data || { message: error.message };
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Delete user
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Toggle user status
  toggleStatus: async (id, status) => {
    try {
      const response = await api.patch(`/users/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Update user password
  updatePassword: async (id, password) => {
    try {
      const response = await api.patch(`/users/${id}/password`, { password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  }
};