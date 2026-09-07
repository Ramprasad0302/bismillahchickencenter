import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiSearch, 
  FiEye,
  FiFileText,
  FiCalendar,
  FiPackage,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiDollarSign
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

const RetailerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // ✅ Fetch orders from API
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Fetching retailer orders...');
      const response = await api.get('/orders/my-orders');
      console.log('✅ Orders fetched:', response.data);
      
      if (response.data.success) {
        setOrders(response.data.data || []);
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

  // ✅ Get filter counts
  const getFilterCounts = () => {
    const all = orders.length;
    const pending = orders.filter(o => o.order_status?.toLowerCase() === 'pending').length;
    const processing = orders.filter(o => o.order_status?.toLowerCase() === 'processing' || o.order_status?.toLowerCase() === 'confirmed').length;
    const enroute = orders.filter(o => o.order_status?.toLowerCase() === 'out_for_delivery').length;
    const delivered = orders.filter(o => o.order_status?.toLowerCase() === 'delivered').length;
    const cancelled = orders.filter(o => o.order_status?.toLowerCase() === 'cancelled').length;
    return { all, pending, processing, enroute, delivered, cancelled };
  };

  const counts = getFilterCounts();

  // ✅ Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.id?.toString().includes(searchTerm);
    
    let matchesFilter = true;
    const status = order.order_status?.toLowerCase();
    switch(activeFilter) {
      case 'pending': matchesFilter = status === 'pending'; break;
      case 'processing': matchesFilter = status === 'processing' || status === 'confirmed'; break;
      case 'enroute': matchesFilter = status === 'out_for_delivery'; break;
      case 'delivered': matchesFilter = status === 'delivered'; break;
      case 'cancelled': matchesFilter = status === 'cancelled'; break;
      default: matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  // ✅ Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // ✅ Get status color and display text
  // An order cancelled while it was still an unpaid UPI order (paid_amount
  // is 0) means the checkout was abandoned before any money moved -- that's
  // clearer to the retailer as "Payment Failed" than a generic "Cancelled",
  // which reads like the shop deliberately cancelled a real order.
  const getStatusInfo = (status, paymentMethod, paidAmount) => {
    const s = status?.toLowerCase() || '';
    if (s === 'cancelled' && paymentMethod === 'upi' && (parseFloat(paidAmount) || 0) === 0) {
      return { color: 'error', label: 'Payment Failed' };
    }
    const statusMap = {
      'pending': { color: 'warning', label: 'Pending' },
      'confirmed': { color: 'primary', label: 'Confirmed' },
      'processing': { color: 'info', label: 'Processing' },
      'out_for_delivery': { color: 'info', label: 'En route' },
      'delivered': { color: 'success', label: 'Delivered' },
      'cancelled': { color: 'error', label: 'Cancelled' }
    };
    return statusMap[s] || { color: 'default', label: status || 'Unknown' };
  };

  // ✅ Get payment status color
  const getPaymentStatusInfo = (status) => {
    const s = status?.toLowerCase() || '';
    const paymentMap = {
      'paid': { color: 'success', label: 'Paid' },
      'partial': { color: 'warning', label: 'Partial' },
      'pending': { color: 'error', label: 'Pending' }
    };
    return paymentMap[s] || { color: 'default', label: status || 'Unknown' };
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 text-[#111714] animate-spin" />
        <p className="mt-4 text-[#6B716D]">Loading your orders...</p>
      </div>
    );
  }

  // ✅ Error state
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
          <h1 className="text-2xl font-semibold text-[#151A17]">My Orders</h1>
          <p className="text-sm text-[#6B716D] mt-1">
            View all your orders ({orders.length} total)
          </p>
        </div>
        <Link to="/retailer/place-order">
          <Button>
            <FiPackage className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
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
          onClick={() => setActiveFilter('processing')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'processing'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Processing ({counts.processing})
        </button>
        <button
          onClick={() => setActiveFilter('enroute')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'enroute'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          En route ({counts.enroute})
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
        <button
          onClick={() => setActiveFilter('cancelled')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'cancelled'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Cancelled ({counts.cancelled})
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by order number..."
          className="max-w-md"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.order_status, order.payment_method, order.paid_amount);
            const paymentInfo = getPaymentStatusInfo(order.payment_status);
            const isDelivered = order.order_status?.toLowerCase() === 'delivered';
            const isPartiallyPaid = order.cash_collected > 0 && order.cash_collected < order.total_amount;
            
            return (
              <div key={order.id} className="bg-white rounded-xl border border-[#E5E8E6] p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-[#151A17]">{order.order_number}</h3>
                      <Badge variant={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                      <Badge variant={paymentInfo.color}>
                        {paymentInfo.label}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[#6B716D]">
                      <span className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        {formatDate(order.order_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiPackage className="w-3 h-3" />
                        {order.kg_ordered} kg ordered
                      </span>
                      <span className="font-medium text-[#151A17]">
                        {formatCurrency(order.total_amount)}
                      </span>
                      
                      {/* ✅ REAL DELIVERED DATA FROM trip_orders */}
                      {isDelivered && (
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Delivered KG with Green Tag */}
                          <span className="text-xs flex items-center gap-1 text-[#16834B] bg-[#E8F5E9] px-3 py-1 rounded-full">
                            <FiCheckCircle className="w-3 h-3" />
                            {order.kg_delivered || order.kg_ordered} kg delivered
                            {order.delivered_date && (
                              <> on {formatDate(order.delivered_date)}</>
                            )}
                          </span>
                          
                          {/* Cash Collected */}
                          {order.cash_collected > 0 && (
                            <span className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full ${
                              isPartiallyPaid 
                                ? 'text-[#C47A13] bg-[#FFF8E1]' 
                                : 'text-[#16834B] bg-[#E8F5E9]'
                            }`}>
                              <FiDollarSign className="w-3 h-3" />
                              {formatCurrency(order.cash_collected)} collected
                              {isPartiallyPaid && ` (${Math.round((order.cash_collected / order.total_amount) * 100)}%)`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Show trip number if assigned */}
                      {order.trip_number && (
                        <span className="text-xs text-[#6B716D] border border-[#E5E8E6] px-2 py-1 rounded-full">
                          Trip: {order.trip_number}
                        </span>
                      )}
                    </div>

                    {/* Delivery Address */}
                    {order.delivery_address && (
                      <div className="mt-1 text-xs text-[#6B716D]">
                        📍 {order.delivery_address}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {/* 🔥 CRITICAL FIX: Use Numeric order.id in URL */}
                    <Link to={`/retailer/orders/${order.id}`}>
                      <Button variant="ghost" size="sm">
                        <FiEye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title={searchTerm || activeFilter !== 'all' ? "No orders found" : "No orders yet"}
            description={searchTerm || activeFilter !== 'all' 
              ? "Try adjusting your search or filter criteria."
              : "Place your first order to get started."}
            icon={FiSearch}
          />
        )}
      </div>

      {/* Refresh Button */}
      {orders.length > 0 && (
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
      )}
    </div>
  );
};

export default RetailerOrders;