import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const staffService = {
  // Get all staff
  getAllStaff: async () => {
    try {
      const response = await api.get('/staff');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get staff by ID
  getStaffById: async (id) => {
    try {
      const response = await api.get(`/staff/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add new staff
  addStaff: async (staffData) => {
    try {
      const response = await api.post('/staff', staffData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update staff
  updateStaff: async (id, staffData) => {
    try {
      const response = await api.put(`/staff/${id}`, staffData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete staff
  deleteStaff: async (id) => {
    try {
      const response = await api.delete(`/staff/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Toggle staff status
  toggleStatus: async (id, status) => {
    try {
      const response = await api.patch(`/staff/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};