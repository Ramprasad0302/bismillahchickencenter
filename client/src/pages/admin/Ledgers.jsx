import { useState, useEffect } from 'react';
import { 
  FiFileText, 
  FiUser, 
  FiSearch,
  FiEye,
  FiPlus,
  FiX,
  FiCheck,
  FiDollarSign,
  FiCreditCard,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

const Ledgers = () => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);

  // ✅ Fetch retailers with their ledger data
  useEffect(() => {
    fetchRetailers();
  }, []);

  const fetchRetailers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Fetching retailers for ledger...');
      const response = await api.get('/retailers/customers');
      console.log('✅ Retailers fetched:', response.data);
      
      if (response.data.success) {
        // Transform data for ledger view
        const transformedData = response.data.data.map(retailer => ({
          id: retailer.id,
          name: retailer.shop_name,
          phone: retailer.phone,
          shop: retailer.shop_name,
          owner: retailer.owner_name,
          creditLimit: parseFloat(retailer.credit_limit) || 0,
          outstanding: parseFloat(retailer.outstanding) || 0,
          totalPurchase: parseFloat(retailer.total_purchase) || 0,
          totalPaid: parseFloat(retailer.total_purchase) - parseFloat(retailer.outstanding) || 0,
          balance: parseFloat(retailer.outstanding) || 0,
          transactions: [], // Will be loaded when viewing ledger
          _raw: retailer // Keep raw data for reference
        }));
        setRetailers(transformedData);
      } else {
        setError(response.data.message || 'Failed to fetch retailers');
      }
    } catch (error) {
      console.error('❌ Error fetching retailers:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to fetch retailers');
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred while fetching retailers.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch transactions for a specific retailer
  const fetchRetailerTransactions = async (retailerId) => {
    try {
      console.log(`📋 Fetching transactions for retailer ${retailerId}...`);
      
      // Ensure retailerId is an integer to prevent backend query issues
      const id = parseInt(retailerId);
      const response = await api.get(`/orders?retailer_id=${id}`);
      
      // Get orders for this retailer
      const orders = response.data.data || [];
      
      // Transform orders into transactions
      const transactions = orders.map(order => ({
        id: `TRX-${order.id}`,
        type: 'debit',
        amount: parseFloat(order.total_amount),
        description: `Order ${order.order_number}`,
        date: new Date(order.order_date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        billId: order.order_number,
        status: order.order_status,
        paidAmount: parseFloat(order.paid_amount) || 0,
        balance: parseFloat(order.balance) || 0
      }));

      // Add payment transactions if they exist (from payments table)
      // For now, we'll just use orders
      
      return transactions;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      return [];
    }
  };

  // ✅ Open retailer ledger with transactions
  const openRetailerLedger = async (retailer) => {
    setSelectedRetailer(retailer);
    
    // Fetch transactions for this retailer
    const transactions = await fetchRetailerTransactions(retailer.id);
    setSelectedRetailer(prev => ({
      ...prev,
      transactions: transactions
    }));
  };

  const closeRetailerLedger = () => {
    setSelectedRetailer(null);
  };

  const openPaymentModal = () => {
    setIsPaymentModalOpen(true);
    setPaymentAmount('');
    setPaymentMethod('Cash');
  };

  // ✅ Get unpaid bills with FIFO order (oldest first)
  const getUnpaidBills = () => {
    if (!selectedRetailer || !selectedRetailer.transactions) return [];
    
    // Get all debit transactions (orders) that are not fully paid
    const debitTransactions = selectedRetailer.transactions.filter(t => 
      t.type === 'debit' && t.balance > 0
    );
    
    // Sort by date (oldest first for FIFO)
    return debitTransactions
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(bill => ({
        billId: bill.billId,
        description: bill.description,
        amount: bill.amount,
        paid: bill.paidAmount || 0,
        balance: bill.balance,
        date: bill.date,
        sortDate: new Date(bill.date)
      }));
  };

  // ✅ Auto-calculate payment allocation based on amount
  const getPaymentAllocation = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || !selectedRetailer) return [];

    const unpaidBills = getUnpaidBills();
    let remainingAmount = amount;
    const allocation = [];

    for (const bill of unpaidBills) {
      if (remainingAmount <= 0) break;
      
      const payAmount = Math.min(remainingAmount, bill.balance);
      allocation.push({
        billId: bill.billId,
        description: bill.description,
        billBalance: bill.balance,
        amountToPay: payAmount,
        remainingAfterPayment: bill.balance - payAmount,
        date: bill.date,
      });
      
      remainingAmount -= payAmount;
    }

    if (remainingAmount > 0) {
      allocation.push({
        billId: 'EXCESS',
        description: 'Excess payment (no more bills)',
        billBalance: 0,
        amountToPay: remainingAmount,
        remainingAfterPayment: 0,
        date: '-',
      });
    }

    return allocation;
  };

  // ✅ Handle payment submission (UPDATED TO CONNECT TO BACKEND)
  const handlePaymentSubmit = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const unpaidBills = getUnpaidBills();
    
    if (unpaidBills.length === 0) {
      alert('No unpaid bills found for this retailer');
      return;
    }

    const totalOutstanding = unpaidBills.reduce((sum, bill) => sum + bill.balance, 0);
    
    if (amount > totalOutstanding) {
      alert(`Amount cannot exceed total outstanding of ₹${totalOutstanding.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    try {
      // 1. SEND DATA TO THE BACKEND
      const payload = {
        retailer_id: selectedRetailer.id,
        amount: amount,
        payment_method: paymentMethod,
        // Map the allocation to a clean array of bill IDs and amounts for the backend
        bill_allocations: paymentAllocation.map(alloc => ({
          bill_id: alloc.billId,
          amount_paid: alloc.amountToPay
        })).filter(alloc => alloc.bill_id !== 'EXCESS') // Remove excess placeholder
      };

      console.log('📤 Sending payment to server:', payload);
      
      // ✅ UPDATED: Changed endpoint to '/orders/payments' to match your server.js mounting
      const response = await api.post('/orders/payments', payload); 
      
      // Check if the backend returned a success
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to record payment');
      }

      // 2. OPTIMISTIC UI UPDATE (Update local state immediately for UI responsiveness)
      let remainingAmount = amount;
      const updatedTransactions = [...selectedRetailer.transactions];
      // Ensure outstanding never goes negative due to a local math error
      let updatedOutstanding = Math.max(0, selectedRetailer.outstanding - amount);

      // Update each bill's balance in the local state array
      for (let i = 0; i < updatedTransactions.length; i++) {
        if (remainingAmount <= 0) break;
        
        const t = updatedTransactions[i];
        if (t.type === 'debit' && t.balance > 0) {
          const payAmount = Math.min(remainingAmount, t.balance);
          t.balance = t.balance - payAmount;
          t.paidAmount = (t.paidAmount || 0) + payAmount;
          remainingAmount -= payAmount;
        }
      }

      // Add a credit (payment) transaction locally so it shows immediately in history
      updatedTransactions.push({
        id: `PAY-${Date.now()}`,
        type: 'credit',
        amount: amount,
        description: `Payment Received - ${paymentMethod}`,
        date: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        billId: 'PAYMENT',
        paidAmount: 0,
        balance: 0
      });

      // Construct the updated retailer object
      const updatedRetailer = {
        ...selectedRetailer,
        transactions: updatedTransactions,
        outstanding: updatedOutstanding,
        totalPaid: (selectedRetailer.totalPaid || 0) + amount,
        balance: updatedOutstanding
      };

      // Update local component state
      setSelectedRetailer(updatedRetailer);
      setRetailers(prev => prev.map(r => 
        r.id === updatedRetailer.id ? updatedRetailer : r
      ));

      setIsPaymentModalOpen(false);
      alert(`✅ Payment of ₹${amount.toLocaleString()} recorded successfully!`);

      // 3. REFRESH DATA FROM SERVER (Crucial step to ensure UI matches DB)
      await fetchRetailers(); 

    } catch (error) {
      console.error('❌ Error recording payment:', error);
      alert(error.message || 'Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  // Get payment allocation for display
  const paymentAllocation = getPaymentAllocation();

  // Get total outstanding
  const getTotalOutstanding = () => {
    const unpaidBills = getUnpaidBills();
    return unpaidBills.reduce((sum, bill) => sum + bill.balance, 0);
  };

  // Filter retailers
  const filteredRetailers = retailers.filter(r =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.shop?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone?.includes(searchTerm) ||
    r.owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 text-[#111714] animate-spin" />
        <p className="mt-4 text-[#6B716D]">Loading ledgers...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#D14343]" />
        <p className="mt-4 text-[#D14343] font-medium">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={fetchRetailers}
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
          <h1 className="text-2xl font-semibold text-[#151A17]">Ledgers</h1>
          <p className="text-sm text-[#6B716D] mt-1">Manage retailer accounts and payments</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchRetailers}
        >
          <FiLoader className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, shop, or phone..."
          className="max-w-md"
        />
      </div>

      {/* Retailers Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        {filteredRetailers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Total Purchase</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Total Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Remaining Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {filteredRetailers.map((retailer) => (
                  <tr key={retailer.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#151A17]">{retailer.shop}</p>
                        <p className="text-xs text-[#6B716D]">{retailer.phone}</p>
                        <p className="text-xs text-[#6B716D]">Owner: {retailer.owner}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {formatCurrency(retailer.totalPurchase)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#16834B]">
                      {formatCurrency(retailer.totalPaid)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        retailer.balance > 0 ? 'text-[#D14343]' : 'text-[#16834B]'
                      }`}>
                        {formatCurrency(retailer.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openRetailerLedger(retailer)}
                          className="px-4 py-2 bg-[#111714] text-white rounded-lg text-sm hover:bg-[#29312d] transition"
                        >
                          <FiEye className="w-4 h-4 inline mr-1" />
                          View Ledger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No retailers found"
            description="Try adjusting your search criteria."
            icon={FiUser}
          />
        )}
      </div>

      {/* Retailer Ledger Modal */}
      <Modal
        isOpen={!!selectedRetailer}
        onClose={closeRetailerLedger}
        title={selectedRetailer?.name || selectedRetailer?.shop}
        description={`${selectedRetailer?.shop} • ${selectedRetailer?.phone}`}
        size="xl"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={closeRetailerLedger}>
              Close
            </Button>
            <Button onClick={openPaymentModal}>
              <FiPlus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>
        }
      >
        {selectedRetailer && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#F6F7F6] rounded-lg p-4 text-center">
                <p className="text-xs text-[#6B716D]">Total Purchase</p>
                <p className="text-xl font-semibold text-[#151A17]">
                  {formatCurrency(selectedRetailer.totalPurchase)}
                </p>
              </div>
              <div className="bg-[#F6F7F6] rounded-lg p-4 text-center">
                <p className="text-xs text-[#6B716D]">Total Paid</p>
                <p className="text-xl font-semibold text-[#16834B]">
                  {formatCurrency(selectedRetailer.totalPaid)}
                </p>
              </div>
              <div className="bg-[#F6F7F6] rounded-lg p-4 text-center">
                <p className="text-xs text-[#6B716D]">Remaining Balance</p>
                <p className={`text-xl font-semibold ${
                  selectedRetailer.balance > 0 ? 'text-[#D14343]' : 'text-[#16834B]'
                }`}>
                  {formatCurrency(selectedRetailer.balance)}
                </p>
              </div>
            </div>

            {/* Unpaid Bills */}
            {getUnpaidBills().length > 0 && (
              <div>
                <h4 className="font-medium text-[#151A17] mb-3">Unpaid Bills (Oldest First)</h4>
                <div className="border border-[#E5E8E6] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F6F7F6]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Bill ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E8E6]">
                      {getUnpaidBills().map((bill) => (
                        <tr key={bill.billId} className="hover:bg-[#F6F7F6] transition">
                          <td className="px-4 py-2 text-sm text-[#6B716D]">{bill.billId}</td>
                          <td className="px-4 py-2 text-sm text-[#151A17]">{bill.description}</td>
                          <td className="px-4 py-2 text-sm text-[#6B716D]">{bill.date}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-[#151A17]">
                            {formatCurrency(bill.amount)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-[#D14343]">
                            {formatCurrency(bill.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div>
              <h4 className="font-medium text-[#151A17] mb-3">Transaction History</h4>
              <div className="border border-[#E5E8E6] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-[#F6F7F6] sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Bill ID</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Credit</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8E6]">
                    {selectedRetailer.transactions?.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-[#F6F7F6] transition">
                        <td className="px-4 py-2 text-sm text-[#6B716D]">
                          {transaction.billId || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-[#151A17]">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-[#6B716D]">
                          {transaction.date}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-[#D14343]">
                          {transaction.type === 'debit' ? formatCurrency(transaction.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-[#16834B]">
                          {transaction.type === 'credit' ? formatCurrency(transaction.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium">
                          {transaction.type === 'debit' ? formatCurrency(transaction.balance || 0) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
        description={`Enter payment details for ${selectedRetailer?.name || selectedRetailer?.shop}`}
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentSubmit}
              disabled={submitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
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
          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Amount <span className="text-[#D14343]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B716D]">₹</span>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
                min="0"
                step="1"
              />
            </div>
            <p className="mt-1 text-xs text-[#6B716D]">
              Total Outstanding: {formatCurrency(getTotalOutstanding())}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Payment Method <span className="text-[#D14343]">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Automatic Allocation Summary */}
          {paymentAmount && parseFloat(paymentAmount) > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#151A17] mb-2">Payment Allocation</h4>
              <div className="border border-[#E5E8E6] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-[#F6F7F6] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Bill</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Bill Balance</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Paying</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8E6]">
                    {paymentAllocation.map((alloc, index) => (
                      <tr key={index} className="hover:bg-[#F6F7F6] transition">
                        <td className="px-3 py-2 text-sm">
                          {alloc.billId === 'EXCESS' ? (
                            <span className="text-[#D14343] font-medium">⚠️ {alloc.description}</span>
                          ) : (
                            <span className="font-medium text-[#151A17]">{alloc.billId}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-[#6B716D]">
                          {alloc.billId !== 'EXCESS' ? alloc.date : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-[#6B716D]">
                          {alloc.billId !== 'EXCESS' ? formatCurrency(alloc.billBalance) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-[#16834B]">
                          {formatCurrency(alloc.amountToPay)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium">
                          {alloc.billId === 'EXCESS' ? (
                            <span className="text-[#D14343]">Not enough bills</span>
                          ) : (
                            <span className={alloc.remainingAfterPayment > 0 ? 'text-[#D14343]' : 'text-[#16834B]'}>
                              {formatCurrency(alloc.remainingAfterPayment)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-[#F6F7F6] rounded-lg">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B716D]">Customer</span>
                <span className="font-medium text-[#151A17]">{selectedRetailer?.name || selectedRetailer?.shop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B716D]">Total Purchase</span>
                <span className="font-medium text-[#151A17]">
                  {formatCurrency(selectedRetailer?.totalPurchase || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B716D]">Total Paid</span>
                <span className="font-medium text-[#16834B]">
                  {formatCurrency(selectedRetailer?.totalPaid || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B716D]">Remaining Balance</span>
                <span className="font-medium text-[#D14343]">
                  {formatCurrency(selectedRetailer?.outstanding || 0)}
                </span>
              </div>
              {paymentAmount && parseFloat(paymentAmount) > 0 && (
                <div className="flex justify-between border-t border-[#16834B]/30 pt-1 mt-1">
                  <span className="text-[#6B716D] font-medium">New Balance</span>
                  <span className="font-medium text-[#16834B]">
                    {formatCurrency(Math.max(0, (selectedRetailer?.outstanding || 0) - parseFloat(paymentAmount)))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Ledgers;