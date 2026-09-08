import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FiSearch,
  FiEye,
  FiEdit2,
  FiPrinter,
  FiDownload,
  FiTruck,
  FiUser,
  FiPhone,
  FiCalendar,
  FiDollarSign,
  FiPackage,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

const Orders = () => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(`${API_URL}/orders`, { headers });
      
      if (response.data.success) {
        setOrders(response.data.data);
        console.log('✅ Orders loaded:', response.data.data.length);
      } else {
        setError(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to fetch orders');
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred while fetching orders.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get filtered counts
  const getFilterCounts = () => {
    const all = orders.length;
    const pending = orders.filter(o => o.order_status === 'pending').length;
    const inTransit = orders.filter(o => o.order_status === 'out_for_delivery').length;
    const delivered = orders.filter(o => o.order_status === 'delivered').length;
    return { all, pending, inTransit, delivered };
  };

  const counts = getFilterCounts();

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.retailer_phone?.includes(searchTerm);
    
    let matchesFilter = true;
    switch(activeFilter) {
      case 'pending':
        matchesFilter = order.order_status === 'pending';
        break;
      case 'inTransit':
        matchesFilter = order.order_status === 'out_for_delivery';
        break;
      case 'delivered':
        matchesFilter = order.order_status === 'delivered';
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get status color
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

  // Cancelled while still an unpaid UPI order = an abandoned checkout, not a
  // deliberately cancelled order -- worth calling out separately so it
  // doesn't read like a real order the shop chose to cancel.
  const getStatusLabel = (status, paymentMethod, paidAmount) => {
    if (status === 'cancelled' && paymentMethod === 'upi' && (parseFloat(paidAmount) || 0) === 0) {
      return 'Payment Failed';
    }
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
        <p className="mt-4 text-[#6B716D]">Loading orders...</p>
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
          onClick={fetchOrders}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Orders</h1>
          <p className="text-sm text-[#6B716D] mt-1">
            All orders across cash, UPI, and store credit ({orders.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={FiPrinter}>
            Print
          </Button>
          <Button variant="outline" icon={FiDownload}>
            Export
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'all'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'pending'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending ({counts.pending})
        </button>
        <button
          onClick={() => setActiveFilter('inTransit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'inTransit'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In Transit ({counts.inTransit})
        </button>
        <button
          onClick={() => setActiveFilter('delivered')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'delivered'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Delivered ({counts.delivered})
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search order ID, customer..."
          className="max-w-md"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">KG</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#151A17]">
                          {order.shop_name || 'Unknown Retailer'}
                        </p>
                        <p className="text-xs text-[#6B716D] flex items-center gap-1">
                          <FiPhone className="w-3 h-3" />
                          {order.retailer_phone || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#151A17]">
                      {order.kg_ordered} kg
                    </td>
                    <td className="px-6 py-4 text-sm text-[#151A17]">
                      ₹{order.rate_per_kg}
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
                        {getStatusLabel(order.order_status, order.payment_method, order.paid_amount)}
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
          <EmptyState
            title="No orders found"
            description="Try adjusting your search or filter criteria."
            icon={FiSearch}
          />
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchOrders}
        >
          <FiLoader className="w-4 h-4 mr-2" />
          Refresh Orders
        </Button>
      </div>
    </div>
  );
};

export default Orders;