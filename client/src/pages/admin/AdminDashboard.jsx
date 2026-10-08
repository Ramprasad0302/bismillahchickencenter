import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FiShoppingBag, 
  FiDollarSign, 
  FiPackage, 
  FiUsers,
  FiCreditCard,
  FiTruck,
  FiClock,
  FiEye,
  FiTrendingUp,
  FiPieChart,
  FiCalendar,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    kgOrdered: 0,
    kgDelivered: 0,
    activeCustomers: 0,
    cashCollection: 0,
    upiCollection: 0,
    outstanding: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    totalHens: 0,
    totalTrays: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    upiCash: 0,
    store: 0,
    credit: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all orders for admin
      const ordersResponse = await axios.get(`${API_URL}/orders`, { headers });
      
      if (ordersResponse.data.success) {
        const orders = ordersResponse.data.data;
        console.log('📋 Orders loaded:', orders.length);

        // Calculate stats
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const totalKgOrdered = orders.reduce((sum, o) => sum + parseFloat(o.kg_ordered || 0), 0);
        const totalKgDelivered = orders.reduce((sum, o) => sum + parseFloat(o.kg_delivered || 0), 0);
        const pendingDeliveries = orders.filter(o => o.order_status === 'pending' || o.order_status === 'out_for_delivery').length;
        const completedDeliveries = orders.filter(o => o.order_status === 'delivered').length;
        const totalOutstanding = orders.reduce((sum, o) => sum + parseFloat(o.balance || 0), 0);

        // Payment breakdown
        const cashOrders = orders.filter(o => o.payment_method === 'cash');
        const upiOrders = orders.filter(o => o.payment_method === 'upi');
        const creditOrders = orders.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial');

        const cashCollection = cashOrders.reduce((sum, o) => sum + parseFloat(o.paid_amount || 0), 0);
        const upiCollection = upiOrders.reduce((sum, o) => sum + parseFloat(o.paid_amount || 0), 0);

        // Get unique customers
        const uniqueCustomers = new Set(orders.map(o => o.retailer_id));

        setStats({
          todayOrders: todayOrders.length,
          todayRevenue: todayRevenue,
          kgOrdered: totalKgOrdered,
          kgDelivered: totalKgDelivered,
          activeCustomers: uniqueCustomers.size,
          cashCollection: cashCollection,
          upiCollection: upiCollection,
          outstanding: totalOutstanding,
          pendingDeliveries: pendingDeliveries,
          completedDeliveries: completedDeliveries,
          totalHens: 0, // You can calculate from trips if needed
          totalTrays: 0  // You can calculate from trips if needed
        });

        setPaymentStats({
          upiCash: cashCollection + upiCollection,
          store: 0, // Store credit
          credit: totalOutstanding
        });

        // Get recent orders (last 5)
        const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentOrders(sortedOrders.slice(0, 5));

        // Calculate weekly revenue
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekData = weekDays.map((day, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - index));
          const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === date.toDateString());
          return {
            day: day,
            amount: dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
          };
        });
        setWeeklyRevenue(weekData);
      }

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to fetch dashboard data');
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred while fetching dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'delivered': 'success',
      'out_for_delivery': 'info',
      'processing': 'primary',
      'pending': 'warning',
      'cancelled': 'danger'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'processing': 'Processing',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status || 'Unknown';
  };

  const getPaymentColor = (status) => {
    const colors = {
      'paid': 'success',
      'partial': 'warning',
      'pending': 'default'
    };
    return colors[status] || 'default';
  };

  const getPaymentLabel = (status) => {
    const labels = {
      'paid': 'Paid',
      'partial': 'Partial',
      'pending': 'Pending'
    };
    return labels[status] || status || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 text-[#111714] animate-spin" />
        <p className="mt-4 text-[#6B716D]">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#D14343]" />
        <p className="mt-4 text-[#D14343] font-medium">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={fetchDashboardData}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#151A17]">
              Good morning, {user?.name || 'Admin'} 👋
            </h1>
            <p className="text-sm text-[#6B716D] mt-1">
              Here's what's happening at Bismillah Chicken Center today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-[#6B716D]" />
            <span className="text-sm text-[#6B716D]">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid - First Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard 
          title="Today's Orders" 
          value={stats.todayOrders} 
          icon={FiShoppingBag}
        />
        <StatCard 
          title="Today's Revenue" 
          value={formatCurrency(stats.todayRevenue)} 
          icon={FiDollarSign}
        />
        <StatCard 
          title="KG Ordered" 
          value={`${stats.kgOrdered.toFixed(1)} kg`}
          subtitle={`${stats.kgDelivered.toFixed(1)} kg delivered`}
          icon={FiPackage}
        />
        <StatCard 
          title="Active Customers" 
          value={stats.activeCustomers} 
          icon={FiUsers}
        />
      </div>

      {/* Stats Grid - Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard 
          title="Cash Collection" 
          value={formatCurrency(stats.cashCollection)} 
          icon={FiCreditCard}
        />
        <StatCard 
          title="UPI Collection" 
          value={formatCurrency(stats.upiCollection)} 
          icon={FiCreditCard}
        />
        <StatCard 
          title="Outstanding" 
          value={formatCurrency(stats.outstanding)} 
          icon={FiDollarSign}
          change="Total pending payments"
        />
        <StatCard 
          title="Pending Deliveries" 
          value={stats.pendingDeliveries}
          subtitle={`${stats.completedDeliveries} completed`}
          icon={FiTruck}
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-[#E5E8E6] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#151A17]">Recent Orders</h2>
            <p className="text-sm text-[#6B716D]">Latest orders from your retailers</p>
          </div>
          <Link to="/admin/orders">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">{order.order_number}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#151A17]">{order.shop_name || 'Unknown'}</p>
                        <p className="text-xs text-[#6B716D]">{order.retailer_phone || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getPaymentColor(order.payment_status)}>
                        {getPaymentLabel(order.payment_status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(order.order_status)}>
                        {getStatusLabel(order.order_status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="sm" icon={FiEye} iconPosition="left">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiPackage className="w-12 h-12 mx-auto text-[#E5E8E6] mb-3" />
            <p className="text-sm text-[#6B716D]">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;