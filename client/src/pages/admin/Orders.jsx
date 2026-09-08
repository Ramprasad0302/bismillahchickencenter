import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FiSearch,
  FiEye,
  FiDownload,
  FiPhone,
  FiLoader,
  FiAlertCircle,
  FiX,
  FiCalendar
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

// YYYY-MM-DD in the browser's local timezone, matching what <input type=date>
// and <input type=month> read/write -- avoids the UTC-shift bug where a
// timestamp near midnight lands on the wrong calendar day.
const toLocalDateStr = (dateInput) => {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DATE_MODE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'day', label: 'Single Day' },
  { value: 'month', label: 'Whole Month' },
  { value: 'range', label: 'Custom Range' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Credit' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Payment Status' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
];

const Orders = () => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // New filters
  const [retailerFilter, setRetailerFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateMode, setDateMode] = useState('all');
  const [singleDate, setSingleDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

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

  // Distinct retailer names present in the loaded orders, for the dropdown --
  // no extra API call needed since every order already carries shop_name.
  const retailerOptions = useMemo(() => {
    const names = new Set(orders.map((o) => o.shop_name).filter(Boolean));
    return Array.from(names).sort();
  }, [orders]);

  // Get filtered counts (order-status tabs, unaffected by the other filters
  // so the tabs always show the true totals)
  const getFilterCounts = () => {
    const all = orders.length;
    const pending = orders.filter(o => o.order_status === 'pending').length;
    const inTransit = orders.filter(o => o.order_status === 'out_for_delivery').length;
    const delivered = orders.filter(o => o.order_status === 'delivered').length;
    return { all, pending, inTransit, delivered };
  };

  const counts = getFilterCounts();

  const matchesDateFilter = (order) => {
    if (dateMode === 'all') return true;
    const orderDateStr = toLocalDateStr(order.created_at);

    if (dateMode === 'today') {
      return orderDateStr === toLocalDateStr(new Date());
    }
    if (dateMode === 'day') {
      return singleDate ? orderDateStr === singleDate : true;
    }
    if (dateMode === 'month') {
      return selectedMonth ? orderDateStr.slice(0, 7) === selectedMonth : true;
    }
    if (dateMode === 'range') {
      if (!rangeFrom && !rangeTo) return true;
      if (rangeFrom && orderDateStr < rangeFrom) return false;
      if (rangeTo && orderDateStr > rangeTo) return false;
      return true;
    }
    return true;
  };

  // Filter orders — combines search, order-status tab, and every filter
  // control below. CSV export reads from this exact same list, so whatever
  // is visible on screen is exactly what gets downloaded.
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

    const matchesRetailer = retailerFilter === 'all' || order.shop_name === retailerFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || order.payment_method === paymentMethodFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;
    
    return (
      matchesSearch &&
      matchesFilter &&
      matchesRetailer &&
      matchesPaymentMethod &&
      matchesPaymentStatus &&
      matchesDateFilter(order)
    );
  });

  const hasActiveFilters =
    retailerFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    paymentStatusFilter !== 'all' ||
    dateMode !== 'all' ||
    searchTerm !== '';

  const clearAllFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
    setRetailerFilter('all');
    setPaymentMethodFilter('all');
    setPaymentStatusFilter('all');
    setDateMode('all');
    setSingleDate('');
    setSelectedMonth('');
    setRangeFrom('');
    setRangeTo('');
  };

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

  // Turns whatever's currently visible (respecting every filter and the
  // search box) into a CSV file and downloads it -- no server round trip
  // needed since the data's already loaded on this page.
  const exportToCsv = () => {
    if (filteredOrders.length === 0) {
      alert('No orders to export for the current filters.');
      return;
    }

    const headers = [
      'Order Number',
      'Retailer',
      'Phone',
      'Date',
      'KG Ordered',
      'Rate per KG',
      'Amount',
      'Payment Method',
      'Payment Status',
      'Order Status',
    ];

    // Wrap every field in quotes and escape any embedded quotes, so a shop
    // name or address containing a comma doesn't split into extra columns.
    const escapeCsvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const rows = filteredOrders.map((order) => [
      order.order_number,
      order.shop_name || 'Unknown Retailer',
      order.retailer_phone || 'N/A',
      formatDate(order.created_at),
      order.kg_ordered,
      order.rate_per_kg,
      order.total_amount,
      order.payment_method?.toUpperCase() || 'N/A',
      getPaymentLabel(order.payment_status),
      getStatusLabel(order.order_status, order.payment_method, order.paid_amount),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvField).join(','))
      .join('\r\n');

    // Prepending the BOM keeps Excel from mangling ₹ and other non-ASCII
    // characters when the file is opened directly.
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const dateStamp = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bismilla-orders-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            All orders across cash, UPI, and store credit ({orders.length} total, showing {filteredOrders.length})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={FiDownload} onClick={exportToCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Order-status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
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

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6 space-y-4">
        {/* Search */}
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search order ID, customer..."
          className="max-w-md"
        />

        <div className="flex flex-wrap items-end gap-3">
          {/* Retailer */}
          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Retailer</label>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[160px]"
            >
              <option value="all">All Retailers</option>
              {retailerOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[130px]"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[150px]"
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date mode */}
          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Date</label>
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[140px]"
            >
              {DATE_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date mode's extra input(s) */}
          {dateMode === 'day' && (
            <div>
              <label className="block text-xs font-medium text-[#6B716D] mb-1">Pick a date</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B716D] pointer-events-none" />
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition"
                />
              </div>
            </div>
          )}

          {dateMode === 'month' && (
            <div>
              <label className="block text-xs font-medium text-[#6B716D] mb-1">Pick a month</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B716D] pointer-events-none" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition"
                />
              </div>
            </div>
          )}

          {dateMode === 'range' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#6B716D] mb-1">From</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B716D] mb-1">To</label>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition"
                />
              </div>
            </>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B716D] hover:text-[#D14343] transition"
            >
              <FiX className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
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
            title="No orders match these filters"
            description="Try a different date, retailer, payment method, or status."
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