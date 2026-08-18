import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import RetailerLayout from '../components/layout/RetailerLayout';
import DriverLayout from '../components/layout/DriverLayout';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import Pricing from '../pages/admin/Pricing';
import Customers from '../pages/admin/Customers';
import Orders from '../pages/admin/Orders';
import Deliveries from '../pages/admin/Deliveries';
import Vehicles from '../pages/admin/Vehicles';
import Ledgers from '../pages/admin/Ledgers';
import Payments from '../pages/admin/Payments';
import Reports from '../pages/admin/Reports';
import Users from '../pages/admin/Users';
import Staff from '../pages/admin/Staff';
import Settings from '../pages/admin/Settings';
import CashVerification from '../pages/admin/CashVerification';
import Expenses from '../pages/admin/Expenses';
import Salaries from '../pages/admin/Salaries';

// Retailer Pages
import RetailerDashboard from '../pages/retailer/RetailerDashboard';
import RetailerPlaceOrder from '../pages/retailer/RetailerPlaceOrder';
import RetailerOrders from '../pages/retailer/RetailerOrders';
import RetailerOrderDetails from '../pages/retailer/RetailerOrderDetails';
import RetailerPayments from '../pages/retailer/RetailerPayments';
import PaymentResult from '../pages/retailer/PaymentResult';
import RetailerProfile from '../pages/retailer/RetailerProfile';

// Driver Pages
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverDeliveries from '../pages/driver/DriverDeliveries';
import DriverCollections from '../pages/driver/DriverCollections';
import DriverHistory from '../pages/driver/DriverHistory';
import DriverProfile from '../pages/driver/DriverProfile';

// Placeholder component for pages not yet implemented
const ComingSoon = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-700">Coming Soon</h1>
      <p className="mt-2 text-gray-500">This page is under development</p>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/pricing" element={<Pricing />} />
            <Route path="/admin/customers" element={<Customers />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/deliveries" element={<Deliveries />} />
            <Route path="/admin/vehicles" element={<Vehicles />} />
            <Route path="/admin/ledgers" element={<Ledgers />} />
            <Route path="/admin/payments" element={<Payments />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/staff" element={<Staff />} />
            <Route path="/admin/cash-verification" element={<CashVerification />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/orders/:id" element={<ComingSoon />} />
            <Route path="/admin/retailers" element={<ComingSoon />} />
            <Route path="/admin/drivers" element={<ComingSoon />} />
            <Route path="/admin/products" element={<ComingSoon />} />
            <Route path="/admin/inventory" element={<ComingSoon />} />
            <Route path="/admin/expenses" element={<Expenses />} />
            <Route path="/admin/salaries" element={<Salaries />} />
          </Route>
        </Route>

        {/* Retailer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['retailer']} />}>
          <Route element={<RetailerLayout />}>
            <Route path="/retailer/dashboard" element={<RetailerDashboard />} />
            <Route path="/retailer/place-order" element={<RetailerPlaceOrder />} />
            <Route path="/retailer/orders" element={<RetailerOrders />} />
            <Route path="/retailer/orders/:id" element={<RetailerOrderDetails />} />
            <Route path="/retailer/payments" element={<RetailerPayments />} />
            <Route path="/retailer/payment/result" element={<PaymentResult />} />
            <Route path="/retailer/profile" element={<RetailerProfile />} />
          </Route>
        </Route>

        {/* Driver Routes */}
        <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
          <Route element={<DriverLayout />}>
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/deliveries" element={<DriverDeliveries />} />
            <Route path="/driver/collections" element={<DriverCollections />} />
            <Route path="/driver/history" element={<DriverHistory />} />
            <Route path="/driver/profile" element={<DriverProfile />} />
          </Route>
        </Route>

        {/* Catch all - 404 */}
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </AuthProvider>
  );
};

export default AppRoutes;