import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  FiShoppingBag, 
  FiPackage,
  FiCreditCard,
  FiAlertCircle,
  FiLoader,
  FiRefreshCw,
  FiUser,
  FiPhone,
  FiMapPin
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const RetailerDashboard = () => {
  const { user } = useAuth();
  
  // API URL from environment
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  console.log('🔗 RetailerDashboard API URL:', API_URL);

  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(true); // Specific loading for price
  const [retailer, setRetailer] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
    outstandingBalance: 0,
    creditLimit: 0
  });
  const [currentOrder, setCurrentOrder] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [error, setError] = useState(null);
  const [pricePerKg, setPricePerKg] = useState(188);
  const [avgWeight, setAvgWeight] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        setError('Please login to view your dashboard');
        setLoading(false);
        return;
      }

      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 1. Get retailer info
      console.log('📋 Fetching retailer info...');
      const retailerResponse = await axios.get(`${API_URL}/retailers/me`, { headers });
      console.log('✅ Retailer response:', retailerResponse.data);
      
      if (retailerResponse.data.success) {
        setRetailer(retailerResponse.data.data);
        console.log('✅ Retailer info loaded:', retailerResponse.data.data);
      } else {
        throw new Error(retailerResponse.data.message || 'Failed to load retailer info');
      }

      // 2. Get retailer stats
      console.log('📊 Fetching retailer stats...');
      const statsResponse = await axios.get(`${API_URL}/retailers/stats`, { headers });
      console.log('✅ Stats response:', statsResponse.data);
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
        console.log('✅ Stats loaded:', statsResponse.data.data);
      }

      // 3. Get orders
      console.log('📋 Fetching orders...');
      const ordersResponse = await axios.get(`${API_URL}/retailers/orders`, { headers });
      console.log('✅ Orders response:', ordersResponse.data);
      
      if (ordersResponse.data.success) {
        const orders = ordersResponse.data.data;
        setRecentOrders(orders.slice(0, 5));
        
        // Set current order (first pending/active order)
        const activeOrder = orders.find(o => 
          o.order_status !== 'delivered' && o.order_status !== 'cancelled'
        );
        if (activeOrder) {
          setCurrentOrder(activeOrder);
        }
        console.log(`✅ ${orders.length} orders loaded`);
      }

      // 4. Get CURRENT PRICING (Updated to get Retailer Specific Price)
      try {
        setPriceLoading(true);
        console.log('📊 Fetching pricing for this retailer...');
        
        // ✅ UPDATED: This endpoint automatically checks if this retailer has a custom price
        const pricingResponse = await axios.get(`${API_URL}/pricing/retailer-price`, { headers });
        
        console.log('✅ Pricing response:', pricingResponse.data);
        if (pricingResponse.data.success) {
          setPricePerKg(pricingResponse.data.price);
          // Global figure set by the admin on the Pricing page. May be null if
          // it has never been set — the card hides itself in that case rather
          // than showing a misleading zero.
          setAvgWeight(pricingResponse.data.avgWeight ?? null);
        } else {
          // Fallback if API succeeds but data is missing
          setPricePerKg(188);
          setAvgWeight(null);
        }
      } catch (pricingError) {
        console.log('ℹ️ Falling back to default pricing:', pricingError.message);
        // Fallback if request fails
        setPricePerKg(188);
        setAvgWeight(null);
      } finally {
        setPriceLoading(false);
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
        
        if (error.response.status === 401) {
          setError('Session expired. Please login again.');
        } else if (error.response.status === 404) {
          setError('Retailer profile not found. Please contact admin.');
        } else {
          setError(error.response.data?.message || 'Failed to load dashboard data. Please try again.');
        }
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        setError('Cannot connect to server. Please check your connection.');
      } else {
        console.error('❌ Request error:', error.message);
        setError('An error occurred. Please try again.');
      }
      
      // Use mock data as fallback
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Fallback mock data if API fails
  const setMockData = () => {
    setRetailer({
      shop_name: user?.name || 'Your Shop',
      owner_name: user?.name || 'Owner',
      phone: user?.phone || '',
      credit_limit: 200000,
      outstanding: 130000
    });
    setStats({
      totalOrders: 0,
      pendingOrders: 0,
      totalSpent: 0,
      outstandingBalance: 130000,
      creditLimit: 200000
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Assalamu Alaikum';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    const variants = {
      'delivered': 'success',
      'cancelled': 'danger',
      'pending': 'warning',
      'confirmed': 'info',
      'processing': 'info',
      'out_for_delivery': 'warning',
      'en route': 'info'
    };
    return variants[status?.toLowerCase()] || 'default';
  };

  // Get status label
  const getStatusLabel = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto">
        <FiAlertCircle className="w-16 h-16 text-[#D14343] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#D14343] mb-2">Unable to Load Dashboard</h3>
        <p className="text-sm text-[#D14343]/80 mb-4">{error}</p>
        <div className="flex flex-col gap-3">
          <Button onClick={loadDashboardData} className="w-full">
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Link to="/retailer/profile">
            <Button variant="outline" className="w-full">
              Go to Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - Assalamu Alaikum */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#151A17]">
          {getGreeting()}, {retailer?.owner_name || user?.name || 'Retailer'} 👋
        </h1>
        <p className="text-sm text-[#6B716D] mt-1">{retailer?.shop_name || 'Your Shop'}</p>
      </div>

      {/* Pricing Card - Cash Price (UPDATED with loading state) */}
      <div className="bg-[#111714] text-white rounded-xl p-6 mb-6 relative">
        <p className="text-sm text-white/60">CASH PRICE</p>
        
        {priceLoading ? (
          <div className="flex items-center mt-1">
            <FiLoader className="w-6 h-6 animate-spin text-white/60 mr-2" />
            <p className="text-xl font-bold animate-pulse text-white/60">Loading...</p>
          </div>
        ) : (
          <p className="text-3xl font-bold mt-1">₹{pricePerKg}</p>
        )}
        
        <p className="text-xs text-white/40 mt-1">per kg (UPI / Cash)</p>

        {/* Average weight per bird — set globally by the admin. Hidden when
            it has never been configured. */}
        {!priceLoading && avgWeight !== null && avgWeight !== undefined && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-white/60">AVERAGE WEIGHT</p>
            <p className="text-xl font-bold mt-1">{avgWeight} kg</p>
            <p className="text-xs text-white/40 mt-1">per bird</p>
          </div>
        )}
      </div>

      {/* Place New Order Button */}
      <Link to="/retailer/place-order">
        <Button className="w-full mb-6 py-4 text-base">
          <FiShoppingBag className="w-5 h-5 mr-2" />
          Place New Order
        </Button>
      </Link>

      {/* Outstanding Balance - Highlighted */}
      {(stats.outstandingBalance > 0 || retailer?.outstanding > 0) && (
        <div className="bg-[#FDEEEE] border-2 border-[#D14343] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="w-6 h-6 text-[#D14343]" />
            <div>
              <p className="text-sm font-medium text-[#D14343]">OUTSTANDING BALANCE</p>
              <p className="text-3xl font-bold text-[#D14343]">
                {formatCurrency(stats.outstandingBalance || retailer?.outstanding || 0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#D14343]/70 mt-2">
            Please clear your outstanding balance to continue placing orders
          </p>
        </div>
      )}

      {/* Current Order */}
      {currentOrder && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-[#151A17]">Current Order</h3>
            <Badge variant={getStatusVariant(currentOrder.order_status)}>
              {getStatusLabel(currentOrder.order_status)}
            </Badge>
          </div>
          <p className="text-sm text-[#6B716D]">{currentOrder.order_number}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-[#6B716D]">{currentOrder.kg_ordered} kg</span>
            <span className="text-lg font-semibold text-[#151A17]">
              {formatCurrency(currentOrder.total_amount)}
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards - Quick Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center">
          <p className="text-xs text-[#6B716D]">Total Orders</p>
          <p className="text-xl font-semibold text-[#151A17]">{stats.totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center">
          <p className="text-xs text-[#6B716D]">Pending</p>
          <p className="text-xl font-semibold text-[#151A17]">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center">
          <p className="text-xs text-[#6B716D]">Total Spent</p>
          <p className="text-xl font-semibold text-[#151A17]">{formatCurrency(stats.totalSpent)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center">
          <p className="text-xs text-[#6B716D]">Credit Limit</p>
          <p className="text-xl font-semibold text-[#151A17]">{formatCurrency(stats.creditLimit)}</p>
        </div>
      </div>

      {/* Recent Orders - Optional */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#151A17]">Recent Orders</h3>
            <Link to="/retailer/orders">
              <button className="text-sm text-[#16834B] hover:underline">View All</button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-[#F6F7F6] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#151A17]">{order.order_number}</p>
                  <p className="text-xs text-[#6B716D]">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#151A17]">{order.kg_ordered} kg</p>
                  <Badge variant={getStatusVariant(order.order_status)}>
                    {getStatusLabel(order.order_status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Cards - Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/retailer/orders" className="bg-white rounded-xl border border-[#E5E8E6] p-4 hover:shadow-md transition text-center">
          <FiPackage className="w-6 h-6 mx-auto text-[#111714] mb-2" />
          <p className="text-sm font-medium text-[#151A17]">My Orders</p>
          <p className="text-xs text-[#6B716D]">View all orders</p>
        </Link>
        <Link to="/retailer/payments" className="bg-white rounded-xl border border-[#E5E8E6] p-4 hover:shadow-md transition text-center">
          <FiCreditCard className="w-6 h-6 mx-auto text-[#111714] mb-2" />
          <p className="text-sm font-medium text-[#151A17]">Payments</p>
          <p className="text-xs text-[#6B716D]">Track payments</p>
        </Link>
        <Link to="/retailer/profile" className="bg-white rounded-xl border border-[#E5E8E6] p-4 hover:shadow-md transition text-center">
          <FiUser className="w-6 h-6 mx-auto text-[#111714] mb-2" />
          <p className="text-sm font-medium text-[#151A17]">Profile</p>
          <p className="text-xs text-[#6B716D]">Your account</p>
        </Link>
      </div>

      {/* Shop Info - Footer */}
      {retailer && (
        <div className="mt-6 p-4 bg-[#F6F7F6] rounded-xl">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#6B716D]">Shop</p>
              <p className="font-medium text-[#151A17]">{retailer.shop_name}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B716D]">Phone</p>
              <p className="font-medium text-[#151A17]">{retailer.phone}</p>
            </div>
            {retailer.address && (
              <div className="col-span-2">
                <p className="text-xs text-[#6B716D]">Address</p>
                <p className="font-medium text-[#151A17]">{retailer.address}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailerDashboard;