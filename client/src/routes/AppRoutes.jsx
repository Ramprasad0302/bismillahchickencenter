import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import RetailerLayout from '../components/layout/RetailerLayout';
import DriverLayout from '../components/layout/DriverLayout';
import BrandLoader from '../components/brand/BrandLoader';

// Pages are code-split: each one downloads only when it is first opened,
// so the first screen loads a fraction of the app instead of all of it.
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const Pricing = lazy(() => import('../pages/admin/Pricing'));
const Customers = lazy(() => import('../pages/admin/Customers'));
const Orders = lazy(() => import('../pages/admin/Orders'));
const OrderDetail = lazy(() => import('../pages/admin/OrderDetail'));
const Deliveries = lazy(() => import('../pages/admin/Deliveries'));
const Vehicles = lazy(() => import('../pages/admin/Vehicles'));
const Ledgers = lazy(() => import('../pages/admin/Ledgers'));
const Payments = lazy(() => import('../pages/admin/Payments'));
const Reports = lazy(() => import('../pages/admin/Reports'));
const Users = lazy(() => import('../pages/admin/Users'));
const Staff = lazy(() => import('../pages/admin/Staff'));
const Settings = lazy(() => import('../pages/admin/Settings'));
const CashVerification = lazy(() => import('../pages/admin/CashVerification'));
const Expenses = lazy(() => import('../pages/admin/Expenses'));
const Salaries = lazy(() => import('../pages/admin/Salaries'));
const TripOverview = lazy(() => import('../pages/admin/TripOverview'));
const RetailerDashboard = lazy(() => import('../pages/retailer/RetailerDashboard'));
const RetailerPlaceOrder = lazy(() => import('../pages/retailer/RetailerPlaceOrder'));
const RetailerOrders = lazy(() => import('../pages/retailer/RetailerOrders'));
const RetailerOrderDetails = lazy(() => import('../pages/retailer/RetailerOrderDetails'));
const RetailerPayments = lazy(() => import('../pages/retailer/RetailerPayments'));
const PaymentResult = lazy(() => import('../pages/retailer/PaymentResult'));
const RetailerProfile = lazy(() => import('../pages/retailer/RetailerProfile'));
const DriverDashboard = lazy(() => import('../pages/driver/DriverDashboard'));
const DriverDeliveries = lazy(() => import('../pages/driver/DriverDeliveries'));
const DriverCollections = lazy(() => import('../pages/driver/DriverCollections'));
const DriverHistory = lazy(() => import('../pages/driver/DriverHistory'));
const DriverProfile = lazy(() => import('../pages/driver/DriverProfile'));

// Placeholder component for pages not yet implemented
const ComingSoon = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center">
      <img src="/logo.png" alt="" className="w-24 h-24 mx-auto rounded-full shadow-[var(--shadow-gold)] animate-float" />
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Coming Soon</h1>
      <p className="mt-2 text-muted">This page is under development</p>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <AuthProvider>
      <Suspense fallback={<BrandLoader fullScreen />}>
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
            <Route path="/admin/orders/:id" element={<OrderDetail />} />
            <Route path="/admin/retailers" element={<ComingSoon />} />
            <Route path="/admin/drivers" element={<ComingSoon />} />
            <Route path="/admin/products" element={<ComingSoon />} />
            <Route path="/admin/inventory" element={<ComingSoon />} />
            <Route path="/admin/expenses" element={<Expenses />} />
            <Route path="/admin/salaries" element={<Salaries />} />
            <Route path="/admin/trip-overview" element={<TripOverview />} />
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
      </Suspense>
    </AuthProvider>
  );
};

export default AppRoutes;