import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HOME = {
  admin: '/admin/dashboard',
  retailer: '/retailer/dashboard',
  driver: '/driver/dashboard',
};

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={HOME[user?.role] || '/login'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
