import { useState, useEffect, useMemo } from 'react';
import { 
  FiCreditCard, 
  FiDollarSign, 
  FiUsers,
  FiSearch,
  FiEye,
  FiPlus,
  FiX,
  FiCheck,
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiFileText,
  FiShoppingBag,
  FiLoader,
  FiAlertCircle,
  FiDownload
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

// YYYY-MM-DD in the browser's local timezone, matching what <input type=date>
// and <input type=month> read/write.
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

const METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'online', label: 'Online' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

const COLLECTED_BY_OPTIONS = [
  { value: 'all', label: 'Office & Drivers' },
  { value: 'admin', label: 'Office Only' },
  { value: 'driver', label: 'Drivers Only' },
];

// Maps what the "Record Payment" dropdown shows to what the payments table's
// method ENUM actually accepts. The backend previously received "Cash",
// "UPI" etc. verbatim, none of which matched its lowercase check, so every
// manually recorded payment silently got stored as 'cash' regardless of
// what was picked.
const METHOD_TO_DB_VALUE = {
  Cash: 'cash',
  UPI: 'upi',
  'Bank Transfer': 'bank_transfer',
  Cheque: 'cheque',
};

const Payments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real Live Data States
  const [payments, setPayments] = useState([]); // Real rows from the `payments` table
  const [retailers, setRetailers] = useState([]);
  const [totalOrdersAmount, setTotalOrdersAmount] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [methodFilter, setMethodFilter] = useState('all');
  const [collectedByFilter, setCollectedByFilter] = useState('all');
  const [retailerFilter, setRetailerFilter] = useState('all');
  const [dateMode, setDateMode] = useState('all');
  const [singleDate, setSingleDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  
  const [paymentForm, setPaymentForm] = useState({
    customer: '',
    amount: '',
    method: 'Cash',
    collectedBy: 'Office',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // ============================================
  // FETCH LIVE DATA FROM BACKEND
  // ============================================
  const fetchPaymentData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Total Orders Amount
      const ordersRes = await api.get('/orders');
      if (ordersRes.data.success) {
        const allOrders = ordersRes.data.data || [];
        const total = allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        setTotalOrdersAmount(total);
      }

      // 2. Fetch All Retailers (For the dropdown and outstanding calc)
      const retailersRes = await api.get('/retailers/customers');
      if (retailersRes.data.success) {
        setRetailers(retailersRes.data.data);
      }

      // 3. Fetch the real payment history -- this endpoint already existed
      // and already returns admin-wide data from the `payments` table; it
      // just wasn't being called from this page before.
      const paymentsRes = await api.get('/payments');
      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.data || []);
      }

    } catch (err) {
      console.error('❌ Error fetching admin payment data:', err);
      setError('Failed to load payment data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  // ============================================
  // CALCULATE STATS FROM REAL PAYMENT DATA
  // ============================================
  const totalOutstanding = retailers.reduce((sum, r) => sum + parseFloat(r.outstanding || 0), 0);

  const totalCash = payments
    .filter((p) => p.method === 'cash')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const totalUPI = payments
    .filter((p) => p.method === 'upi' || p.method === 'online')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const totalOfficePayments = payments
    .filter((p) => p.collected_by_role === 'admin')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const totalDriverCollected = payments
    .filter((p) => p.collected_by_role === 'driver')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  // ============================================
  // HANDLE SUBMIT NEW PAYMENT
  // ============================================
  const handlePaymentSubmit = async () => {
    if (!paymentForm.customer || !paymentForm.amount) {
      alert('Please select a customer and enter amount');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected retailer ID
      const selectedRetailer = retailers.find(r => r.shop_name === paymentForm.customer);
      if (!selectedRetailer) {
        throw new Error('Invalid customer selected');
      }

      // This payload goes to your backend.
      // Since your Ledger page uses /api/orders/payments, we use the exact same route here!
      const payload = {
        retailer_id: selectedRetailer.id,
        amount: parseFloat(paymentForm.amount),
        // Converted to the lowercase value the payments table's method
        // ENUM actually accepts -- see METHOD_TO_DB_VALUE above.
        payment_method: METHOD_TO_DB_VALUE[paymentForm.method] || 'cash',
        // We pass an empty bill_allocations array because this is just a manual cash entry
        bill_allocations: []
      };

      // Send to the exact same endpoint used by the Ledger page
      const response = await api.post('/orders/payments', payload);
      
      if (response.data.success) {
        setIsPaymentModalOpen(false);
        setPaymentForm({
          customer: '',
          amount: '',
          method: 'Cash',
          collectedBy: 'Office',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        alert('Payment recorded successfully!');
        fetchPaymentData(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Failed to record payment');
      }

    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMethodColor = (method) => {
    const colors = {
      'cash': 'success',
      'upi': 'info',
      'online': 'info',
      'bank_transfer': 'warning',
      'cheque': 'default',
    };
    return colors[method] || 'default';
  };

  const getMethodLabel = (method) => {
    const labels = {
      'cash': 'Cash',
      'upi': 'UPI',
      'online': 'Online',
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
    };
    return labels[method] || method || 'Unknown';
  };

  // Distinct retailer names present in the loaded payments, for the filter
  // dropdown.
  const retailerOptions = useMemo(() => {
    const names = new Set(payments.map((p) => p.shop_name).filter(Boolean));
    return Array.from(names).sort();
  }, [payments]);

  const matchesDateFilter = (payment) => {
    if (dateMode === 'all') return true;
    const paymentDateStr = toLocalDateStr(payment.date || payment.created_at);

    if (dateMode === 'today') {
      return paymentDateStr === toLocalDateStr(new Date());
    }
    if (dateMode === 'day') {
      return singleDate ? paymentDateStr === singleDate : true;
    }
    if (dateMode === 'month') {
      return selectedMonth ? paymentDateStr.slice(0, 7) === selectedMonth : true;
    }
    if (dateMode === 'range') {
      if (!rangeFrom && !rangeTo) return true;
      if (rangeFrom && paymentDateStr < rangeFrom) return false;
      if (rangeTo && paymentDateStr > rangeTo) return false;
      return true;
    }
    return true;
  };

  // Filter payments — combines search and every filter control below. CSV
  // export reads from this exact same list.
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.collected_by?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    const matchesCollectedBy = collectedByFilter === 'all' || p.collected_by_role === collectedByFilter;
    const matchesRetailer = retailerFilter === 'all' || p.shop_name === retailerFilter;

    return matchesSearch && matchesMethod && matchesCollectedBy && matchesRetailer && matchesDateFilter(p);
  });

  const hasActiveFilters =
    methodFilter !== 'all' ||
    collectedByFilter !== 'all' ||
    retailerFilter !== 'all' ||
    dateMode !== 'all' ||
    searchTerm !== '';

  const clearAllFilters = () => {
    setSearchTerm('');
    setMethodFilter('all');
    setCollectedByFilter('all');
    setRetailerFilter('all');
    setDateMode('all');
    setSingleDate('');
    setSelectedMonth('');
    setRangeFrom('');
    setRangeTo('');
  };

  // Downloads exactly what's currently filtered as a CSV file.
  const exportToCsv = () => {
    if (filteredPayments.length === 0) {
      alert('No payments to export for the current filters.');
      return;
    }

    const headers = [
      'Payment Number',
      'Retailer',
      'Order Number',
      'Amount',
      'Method',
      'Collected By',
      'Role',
      'Date',
    ];
    const escapeCsvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const rows = filteredPayments.map((p) => [
      p.payment_number,
      p.shop_name || 'N/A',
      p.order_number || '-',
      p.amount,
      getMethodLabel(p.method),
      p.collected_by || 'N/A',
      p.collected_by_role === 'admin' ? 'Office' : 'Driver',
      formatDate(p.date || p.created_at),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvField).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bismilla-payments-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading payments data...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-lg mx-auto mt-8">
        <FiAlertCircle className="w-16 h-16 text-[#D14343] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#D14343] mb-2">Unable to Load Payments</h3>
        <p className="text-sm text-[#D14343]/80 mb-4">{error}</p>
        <button 
          onClick={fetchPaymentData} 
          className="px-4 py-2 bg-[#D14343] text-white rounded-lg hover:bg-[#b03939] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER PAGE
  // ============================================
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Payments</h1>
          <p className="text-sm text-[#6B716D] mt-1">All collections across drivers and office</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" icon={FiDownload} onClick={exportToCsv}>
            Export CSV
          </Button>
          <Button onClick={() => setIsPaymentModalOpen(true)}>
            <FiPlus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Statistics Cards -- already responsive (1 col mobile, 2 tablet, 5
          desktop); the actual mobile breakage was in the Summary Row below,
          which never wrapped and pushed content past the viewport. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F6F7F6] rounded-lg shrink-0">
              <FiShoppingBag className="w-5 h-5 text-[#151A17]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#6B716D]">Total Orders</p>
              <p className="text-2xl font-semibold text-[#151A17] truncate">{formatCurrency(totalOrdersAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F6F7F6] rounded-lg shrink-0">
              <FiDollarSign className="w-5 h-5 text-[#111714]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#6B716D]">Cash Collected</p>
              <p className="text-2xl font-semibold text-[#151A17] truncate">{formatCurrency(totalCash)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F6F7F6] rounded-lg shrink-0">
              <FiCreditCard className="w-5 h-5 text-[#3B6FD8]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#6B716D]">UPI Collected</p>
              <p className="text-2xl font-semibold text-[#151A17] truncate">{formatCurrency(totalUPI)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F6F7F6] rounded-lg shrink-0">
              <FiFileText className="w-5 h-5 text-[#C47A13]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#6B716D]">Office Payments</p>
              <p className="text-2xl font-semibold text-[#151A17] truncate">{formatCurrency(totalOfficePayments)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F6F7F6] rounded-lg shrink-0">
              <FiUsers className="w-5 h-5 text-[#D14343]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#6B716D]">Outstanding</p>
              <p className="text-2xl font-semibold text-[#D14343] truncate">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Row -- this is what was actually overflowing on mobile:
          a single flex row with no wrap and fixed vertical dividers. Now
          stacks vertically on small screens and drops the dividers there. */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B716D]">Total Collected:</span>
              <span className="text-lg font-semibold text-[#16834B]">{formatCurrency(totalCollected)}</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-[#E5E8E6]"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B716D]">Total Orders:</span>
              <span className="text-lg font-semibold text-[#151A17]">{formatCurrency(totalOrdersAmount)}</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-[#E5E8E6]"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B716D]">Outstanding:</span>
              <span className="text-lg font-semibold text-[#D14343]">{formatCurrency(totalOutstanding)}</span>
            </div>
          </div>
          <div className="text-sm text-[#6B716D]">
            <span className="font-medium">Collection Rate:</span>{' '}
            <span className="font-semibold text-[#16834B]">
              {totalOrdersAmount > 0 
                ? `${Math.round((totalCollected / totalOrdersAmount) * 100)}%` 
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6 space-y-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by payment ID, customer, method, or collector..."
          className="max-w-md"
        />

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Retailer</label>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[150px]"
            >
              <option value="all">All Retailers</option>
              {retailerOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[140px]"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Collected By</label>
            <select
              value={collectedByFilter}
              onChange={(e) => setCollectedByFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[150px]"
            >
              {COLLECTED_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Date</label>
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[130px]"
            >
              {DATE_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

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

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8E6]">
          <h2 className="text-lg font-semibold text-[#151A17]">
            Recent Collections ({filteredPayments.length})
          </h2>
        </div>

        {filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Collected By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {payment.payment_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#151A17]">
                      {payment.shop_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      {payment.order_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#16834B]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getMethodColor(payment.method)}>
                        {getMethodLabel(payment.method)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#151A17]">
                      {payment.collected_by || 'N/A'}
                      <span className="text-xs text-[#6B716D] ml-1">
                        ({payment.collected_by_role === 'admin' ? 'Office' : 'Driver'})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      {formatDate(payment.date || payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No payments found"
            description="Try adjusting your filters, or record a new payment."
            icon={FiCreditCard}
          />
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentForm({
            customer: '',
            amount: '',
            method: 'Cash',
            collectedBy: 'Office',
            date: new Date().toISOString().split('T')[0],
            notes: '',
          });
        }}
        title="Record Payment"
        description="Enter payment details"
        footer={
          <div className="flex w-full gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setPaymentForm({
                  customer: '',
                  amount: '',
                  method: 'Cash',
                  collectedBy: 'Office',
                  date: new Date().toISOString().split('T')[0],
                  notes: '',
                });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handlePaymentSubmit}
              disabled={isSubmitting || !paymentForm.customer || !paymentForm.amount}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Customer <span className="text-[#D14343]">*</span>
            </label>
            <select
              value={paymentForm.customer}
              onChange={(e) => setPaymentForm({ ...paymentForm, customer: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="">Select customer...</option>
              {retailers.map((retailer) => (
                <option key={retailer.id} value={retailer.shop_name}>
                  {retailer.shop_name} (Outstanding: {formatCurrency(retailer.outstanding)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Amount <span className="text-[#D14343]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B716D]">₹</span>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
                min="0"
                step="1"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Payment Method <span className="text-[#D14343]">*</span>
            </label>
            <select
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Collected By */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Collected By <span className="text-[#D14343]">*</span>
            </label>
            <select
              value={paymentForm.collectedBy}
              onChange={(e) => setPaymentForm({ ...paymentForm, collectedBy: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="Office">Office</option>
              <option value="D001">Driver 1</option>
              <option value="D002">Driver 2</option>
              <option value="D003">Driver 3</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={paymentForm.date}
              onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
              rows="2"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;