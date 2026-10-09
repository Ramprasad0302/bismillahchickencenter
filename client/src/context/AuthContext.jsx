import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

// Read the saved session synchronously so protected pages render on the very
// first paint instead of flashing a spinner while an effect runs.
const readSession = () => {
  try {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) return { ...JSON.parse(savedUser), token };
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readSession);

  const login = (userData) => {
    const userWithToken = {
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email || '',
      role: userData.role,
      token: userData.token,
    };

    setUser(userWithToken);
    localStorage.setItem('user', JSON.stringify(userWithToken));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const isAuthenticated = !!user && !!localStorage.getItem('token');

  return (
    <AuthContext.Provider value={{ user, login, logout, loading: false, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
