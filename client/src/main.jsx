import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import api from "./services/api";
import { installHttpCache } from "./services/httpCache";
import "./index.css";

// Pages use both the shared `api` instance and plain axios; cache both.
installHttpCache(axios);
installHttpCache(api);

// When the server rejects the session (expired, or the account was
// deactivated), sign out and go back to the login screen instead of leaving
// the user on a page full of errors.
const onUnauthorized = (error) => {
  const url = error.config?.url || '';
  if (error.response?.status === 401 && !url.includes('/auth/login') && localStorage.getItem('token')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }
  return Promise.reject(error);
};
axios.interceptors.response.use((r) => r, onUnauthorized);
api.interceptors.response.use((r) => r, onUnauthorized);

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
