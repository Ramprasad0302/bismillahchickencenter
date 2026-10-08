import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('🔍 AuthProvider - Checking localStorage...');
    console.log('📦 savedUser:', savedUser);
    console.log('📦 token exists:', !!token);
    
    if (savedUser && token) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ Parsed user:', parsedUser);
        setUser({ ...parsedUser, token });
      } catch (error) {
        console.error('❌ Error parsing user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
      console.log('ℹ️ No saved session found');
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    console.log('🔐 Login called with:', userData);
    
    const userWithToken = {
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email || '',
      role: userData.role,
      token: userData.token,
    };
    
    console.log('📝 Saving user:', userWithToken);
    setUser(userWithToken);
    localStorage.setItem('user', JSON.stringify(userWithToken));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
    
    console.log('✅ User saved to localStorage');
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Calculate isAuthenticated
  const isAuthenticated = !!user && !!localStorage.getItem('token');

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};