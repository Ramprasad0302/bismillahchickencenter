import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  console.log('🔒 ProtectedRoute - Checking access...');
  console.log('🔒 isAuthenticated:', isAuthenticated);
  console.log('🔒 user:', user);
  console.log('🔒 loading:', loading);
  console.log('🔒 allowedRoles:', allowedRoles);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#111714] border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔒 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    console.log(`🔒 Role ${user?.role} not allowed. Redirecting...`);
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'retailer') return <Navigate to="/retailer/dashboard" replace />;
    if (user?.role === 'driver') return <Navigate to="/driver/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Access granted! Rendering outlet.');
  return <Outlet />;
};

export default ProtectedRoute;