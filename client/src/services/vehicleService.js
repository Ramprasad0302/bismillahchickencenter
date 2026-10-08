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

// Add token if available (optional for now)
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
    return Promise.reject(error);
  }
);

export const vehicleService = {
  // Get all vehicles
  getAllVehicles: async () => {
    try {
      const response = await api.get('/vehicles');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Get vehicle by ID
  getVehicleById: async (id) => {
    try {
      const response = await api.get(`/vehicles/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Add new vehicle
  addVehicle: async (vehicleData) => {
    try {
      const response = await api.post('/vehicles', vehicleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Update vehicle
  updateVehicle: async (id, vehicleData) => {
    try {
      const response = await api.put(`/vehicles/${id}`, vehicleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Delete vehicle
  deleteVehicle: async (id) => {
    try {
      const response = await api.delete(`/vehicles/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Toggle vehicle status
  toggleStatus: async (id, status) => {
    try {
      const response = await api.patch(`/vehicles/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Update vehicle trips
  updateTrips: async (id, tripData) => {
    try {
      const response = await api.patch(`/vehicles/${id}/trips`, tripData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  }
};