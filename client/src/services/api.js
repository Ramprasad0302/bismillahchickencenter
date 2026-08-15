import axios from 'axios';

<<<<<<< HEAD
// Was hardcoded to http://localhost:5000/api, which breaks the moment this is
// deployed. Put VITE_API_URL in client/.env (note: Vite only reads .env files
// inside the client folder, not server/.env).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
=======
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

<<<<<<< HEAD
export default api;
=======
export default api;
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
