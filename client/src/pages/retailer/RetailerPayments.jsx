import { useState, useEffect } from 'react';
<<<<<<< HEAD
import {
  FiCreditCard,
  FiAlertCircle,
  FiLoader,
  FiArrowRight,
  FiLock,
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import {
  getPaymentSummary,
  getPaymentHistory,
  startCheckout,
  redirectToGateway,
} from '../../services/paymentService';
=======
import { 
  FiCreditCard, 
  FiDollarSign, 
  FiClock,
  FiCalendar,
  FiAlertCircle,
  FiLoader
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de

const RetailerPayments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
<<<<<<< HEAD

  // Live data
  const [payable, setPayable] = useState(0);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);

  // Pay-now panel
  const [amountInput, setAmountInput] = useState('');
  const [payError, setPayError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        getPaymentSummary(),
        getPaymentHistory(),
      ]);

      if (summaryRes.success) {
        setPayable(summaryRes.data.payable || 0);
        setBills(summaryRes.data.bills || []);
        setAmountInput(
          summaryRes.data.payable > 0 ? String(summaryRes.data.payable) : ''
        );
      }
      if (historyRes.success) {
        setPayments(historyRes.data || []);
      }
    } catch (err) {
      console.error('Error loading payment data:', err);
      setError('Payment data could not be loaded. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PAY NOW
  // ============================================
  const handlePayNow = async () => {
    setPayError(null);

    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) {
      setPayError('Enter an amount greater than zero.');
      return;
    }
    if (amount > payable) {
      setPayError(`The most you can pay right now is ${formatCurrency(payable)}.`);
      return;
    }

    setRedirecting(true);
    try {
      const res = await startCheckout({ amount });
      if (res.success && res.data.redirect_url) {
        redirectToGateway(res.data.redirect_url);
      } else {
        setPayError(res.message || 'The payment could not be started.');
        setRedirecting(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setPayError(
        err.response?.data?.message || 'The payment could not be started. Try again.'
      );
      setRedirecting(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
=======
  
  // Live Data States
  const [outstanding, setOutstanding] = useState(0);
  const [totalPaidThisMonth, setTotalPaidThisMonth] = useState(0);
  const [payments, setPayments] = useState([]);

  // ============================================
  // FETCH LIVE DATA FROM BACKEND
  // ============================================
  useEffect(() => {
    const fetchPaymentData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Stats (Outstanding & Total Paid)
        const statsRes = await api.get('/retailers/stats');
        if (statsRes.data.success) {
          const stats = statsRes.data.data;
          setOutstanding(stats.outstandingBalance || 0);
          // Calculate "Paid This Month". 
          // If your DB doesn't have a "monthly" column, we just show total_paid.
          // You can refine this later if you add a monthly query.
          setTotalPaidThisMonth(stats.total_paid || 0);
        }

        // 2. Fetch Payment History
        // Note: If you haven't created the backend GET /api/payments route yet, 
        // this will return an empty array silently using the catch block.
        try {
          const paymentsRes = await api.get('/payments');
          if (paymentsRes.data.success) {
            setPayments(paymentsRes.data.data || []);
          }
        } catch (paymentErr) {
          console.log('ℹ️ Payments history endpoint not ready yet, using empty list.');
          setPayments([]);
        }

      } catch (err) {
        console.error('❌ Error fetching payment data:', err);
        setError('Failed to load payment data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
<<<<<<< HEAD
=======
  };

  // Calculate last payment details from the array
  const lastPayment = payments.length > 0 ? payments[0] : null;
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
<<<<<<< HEAD
      year: 'numeric',
    });
  };

=======
      year: 'numeric'
    });
  };

  // Get status badge variant based on status string
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
  const getStatusVariant = (status) => {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'paid' || s === 'verified') return 'success';
<<<<<<< HEAD
    if (s === 'pending' || s === 'partial') return 'warning';
=======
    if (s === 'pending') return 'warning';
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    if (s === 'failed' || s === 'cancelled') return 'danger';
    return 'default';
  };

<<<<<<< HEAD
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const lastPayment = payments.length > 0 ? payments[0] : null;

  // ============================================
  // LOADING
=======
  // ============================================
  // LOADING STATE
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading payment data...</p>
        </div>
      </div>
    );
  }

  // ============================================
<<<<<<< HEAD
  // ERROR
=======
  // ERROR STATE
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
  // ============================================
  if (error) {
    return (
      <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto mt-8">
        <FiAlertCircle className="w-16 h-16 text-[#D14343] mx-auto mb-4" />
<<<<<<< HEAD
        <h3 className="text-lg font-semibold text-[#D14343] mb-2">
          Payments unavailable
        </h3>
        <p className="text-sm text-[#D14343]/80 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-[#D14343] text-white rounded-lg hover:bg-[#b03939] transition"
        >
          Try again
=======
        <h3 className="text-lg font-semibold text-[#D14343] mb-2">Unable to Load Payments</h3>
        <p className="text-sm text-[#D14343]/80 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-[#D14343] text-white rounded-lg hover:bg-[#b03939] transition"
        >
          Retry
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
        </button>
      </div>
    );
  }

  // ============================================
<<<<<<< HEAD
  // PAGE
  // ============================================
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#151A17]">Payments</h1>
        <p className="text-sm text-[#6B716D] mt-1">
          Pay your balance and review past payments
        </p>
      </div>

      {/* ---------- Outstanding + Pay now ---------- */}
      {payable > 0 ? (
        <div className="bg-white border-2 border-[#D14343] rounded-xl overflow-hidden mb-6">
          <div className="bg-[#FDEEEE] px-6 py-5">
            <p className="text-sm font-medium text-[#D14343]">OUTSTANDING BALANCE</p>
            <p className="text-3xl font-bold text-[#D14343]">
              {formatCurrency(payable)}
            </p>
            <p className="text-xs text-[#D14343]/80 mt-1">
              Across {bills.length} unpaid {bills.length === 1 ? 'bill' : 'bills'}
            </p>
          </div>

          <div className="px-6 py-5">
            <label
              htmlFor="pay-amount"
              className="block text-sm font-medium text-[#151A17] mb-2"
            >
              Amount to pay
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B716D]">
                  ₹
                </span>
                <input
                  id="pay-amount"
                  type="number"
                  min="1"
                  max={payable}
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  disabled={redirecting}
                  className="w-full pl-7 pr-3 py-2.5 border border-[#E5E8E6] rounded-lg text-[#151A17] focus:outline-none focus:ring-2 focus:ring-[#16834B]/40 focus:border-[#16834B] disabled:bg-[#F6F7F6]"
                />
              </div>
              <button
                type="button"
                onClick={handlePayNow}
                disabled={redirecting}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#16834B] text-white font-medium hover:bg-[#116339] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {redirecting ? (
                  <>
                    <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                    Opening payment page
                  </>
                ) : (
                  <>
                    Pay {formatCurrency(parseFloat(amountInput) || 0)}
                    <FiArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAmountInput(String(payable))}
              className="text-xs text-[#16834B] mt-2 hover:underline"
            >
              Pay the full balance
            </button>

            {payError && (
              <p className="text-sm text-[#D14343] mt-3">{payError}</p>
            )}

            <p className="flex items-center gap-1.5 text-xs text-[#6B716D] mt-4">
              <FiLock className="w-3 h-3" />
              You'll be taken to a secure payment page. Card details never reach
              our servers.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#EDF7F1] border border-[#16834B]/30 rounded-xl p-6 mb-6">
          <p className="text-sm font-medium text-[#16834B]">NO BALANCE DUE</p>
          <p className="text-2xl font-bold text-[#16834B] mt-1">All bills settled</p>
        </div>
      )}

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-sm text-[#6B716D]">Total paid</p>
          <p className="text-2xl font-bold text-[#16834B]">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-sm text-[#6B716D]">Last payment</p>
          <p className="text-2xl font-bold text-[#151A17]">
            {lastPayment ? formatCurrency(lastPayment.amount) : '₹0'}
          </p>
          <p className="text-xs text-[#6B716D]">
            {lastPayment ? formatDate(lastPayment.date) : 'No payments yet'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-sm text-[#6B716D]">Method</p>
          <p className="text-2xl font-bold text-[#151A17] capitalize">
=======
  // RENDER PAGE
  // ============================================
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#151A17]">Payments</h1>
        <p className="text-sm text-[#6B716D] mt-1">Track your payments and outstanding</p>
      </div>

      {/* Outstanding - Highlighted at Top */}
      <div className="bg-[#FDEEEE] border-2 border-[#D14343] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3">
          <FiAlertCircle className="w-6 h-6 text-[#D14343]" />
          <div>
            <p className="text-sm font-medium text-[#D14343]">OUTSTANDING BALANCE</p>
            <p className="text-3xl font-bold text-[#D14343]">
              {formatCurrency(outstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-sm text-[#6B716D]">Total Paid</p>
          <p className="text-2xl font-bold text-[#16834B]">
            {formatCurrency(totalPaidThisMonth)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-sm text-[#6B716D]">Last Payment</p>
          <p className="text-2xl font-bold text-[#151A17]">
            {lastPayment ? formatCurrency(lastPayment.amount) : '₹0'}
          </p>
          <p className="text-xs text-[#6B716D]">{lastPayment ? formatDate(lastPayment.date) : 'No payments yet'}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-sm text-[#6B716D]">Payment Method</p>
          <p className="text-2xl font-bold text-[#151A17]">
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
            {lastPayment?.method || '-'}
          </p>
          <p className="text-xs text-[#6B716D]">Most recent</p>
        </div>
      </div>

<<<<<<< HEAD
      {/* ---------- Unpaid bills ---------- */}
      {bills.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#E5E8E6]">
            <h2 className="text-lg font-semibold text-[#151A17]">Unpaid bills</h2>
            <p className="text-xs text-[#6B716D] mt-0.5">
              Payments are applied to the oldest bill first
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {bill.order_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      {formatDate(bill.order_date)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#6B716D]">
                      {formatCurrency(bill.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-[#D14343]">
                      {formatCurrency(bill.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- History ---------- */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8E6]">
          <h2 className="text-lg font-semibold text-[#151A17]">Payment history</h2>
        </div>

        {payments.length === 0 ? (
          <div className="p-10 text-center text-[#6B716D]">
            <FiCreditCard className="w-12 h-12 mx-auto mb-3 text-[#E5E8E6]" />
            <p>No payments yet.</p>
            <p className="text-sm">Your payments will be listed here.</p>
=======
      {/* Payment History */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8E6]">
          <h2 className="text-lg font-semibold text-[#151A17]">Payment History</h2>
        </div>
        
        {payments.length === 0 ? (
          <div className="p-10 text-center text-[#6B716D]">
            <FiCreditCard className="w-12 h-12 mx-auto mb-3 text-[#E5E8E6]" />
            <p>No payment history found.</p>
            <p className="text-sm">Payments will appear here once you make an order.</p>
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
<<<<<<< HEAD
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">
                    Status
                  </th>
=======
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Payment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {payments.map((payment) => (
<<<<<<< HEAD
                  <tr
                    key={payment.id || payment.payment_number}
                    className="hover:bg-[#F6F7F6] transition"
                  >
=======
                  <tr key={payment.id || payment.payment_number} className="hover:bg-[#F6F7F6] transition">
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {payment.payment_number || payment.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      {formatDate(payment.date || payment.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
<<<<<<< HEAD
                      {payment.order_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D] capitalize">
=======
                      {payment.order_id || payment.order_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
                      {payment.method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-[#16834B]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status || 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default RetailerPayments;
=======
export default RetailerPayments;
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
