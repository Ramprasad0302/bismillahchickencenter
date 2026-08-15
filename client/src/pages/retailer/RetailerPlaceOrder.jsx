import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiShoppingBag, 
  FiDollarSign, 
  FiCheck,
  FiAlertCircle,
  FiSmartphone,
  FiLoader,
  FiMapPin,
  FiMessageSquare,
  FiCreditCard,
  FiPackage,
  FiCheckCircle,
  FiHome
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import api from '../../services/api';

const RetailerPlaceOrder = () => {
  const navigate = useNavigate();
  const [kg, setKg] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  // LIVE DATA STATES
  const [pricePerKg, setPricePerKg] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [dataError, setDataError] = useState(null);

  const quickKgOptions = [50, 100, 200, 300, 500];

  // FETCH LIVE PRICE & OUTSTANDING ON LOAD
  useEffect(() => {
    const fetchLiveData = async () => {
      setIsPageLoading(true);
      setDataError(null);
      try {
        // 1. Get Retailer Specific Price
        const priceRes = await api.get('/pricing/retailer-price');
        if (priceRes.data.success) {
          setPricePerKg(priceRes.data.price);
        } else {
          setPricePerKg(188); // Fallback
        }

        // 2. Get Outstanding Balance
        const statsRes = await api.get('/retailers/stats');
        if (statsRes.data.success) {
          setOutstanding(statsRes.data.data.outstandingBalance || 0);
        }

      } catch (err) {
        console.error('Error loading place order data:', err);
        setDataError('Failed to load pricing/outstanding data.');
        setPricePerKg(188); // Fallback
        setOutstanding(0);  // Fallback
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchLiveData();
  }, []);

  const totalAmount = kg ? parseFloat(kg) * pricePerKg : 0;

  const handlePlaceOrder = () => {
    setError(null);
    setSuccessMessage(null);
    setPlacedOrder(null);

    if (!kg || parseFloat(kg) <= 0) {
      setError('Please enter a valid quantity in KG');
      return;
    }
    if (totalAmount > outstanding) {
      setError(`You have outstanding balance of ₹${outstanding.toLocaleString()}. Please clear your dues first.`);
      return;
    }
    
    const orderSummary = {
      kg: parseFloat(kg),
      rate_per_kg: pricePerKg,
      totalAmount: totalAmount,
      paymentMethod: selectedPayment === 'upi' ? 'UPI' : 'Cash',
      deliveryAddress: deliveryAddress || 'Not provided',
      notes: notes || 'No notes',
      customAmount: customAmount ? parseFloat(customAmount) : null
    };
    
    setOrderData(orderSummary);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const apiOrderData = {
        kg_ordered: orderData.kg,
        rate_per_kg: orderData.rate_per_kg,
        delivery_charge: 0,
        discount: 0,
        payment_method: selectedPayment === 'upi' ? 'upi' : 'cash',
        delivery_address: deliveryAddress || null,
        notes: notes || null,
        order_date: new Date().toISOString().split('T')[0]
      };

      console.log('📦 Sending order data:', apiOrderData);

      const response = await api.post('/orders', apiOrderData);
      
      console.log('✅ Order placed successfully:', response.data);

      // Close modal
      setIsConfirmModalOpen(false);
      
      // Store the order details
      const orderDetails = {
        orderNumber: response.data.data.order_number,
        kg: orderData.kg,
        totalAmount: parseFloat(response.data.data.total_amount) || 0,
        paymentMethod: orderData.paymentMethod,
        deliveryAddress: orderData.deliveryAddress,
        notes: orderData.notes,
        customAmount: orderData.customAmount,
        createdAt: new Date().toLocaleString()
      };

      console.log('📋 Setting placedOrder:', orderDetails);
      
      setPlacedOrder(orderDetails);
      
      // Reset form
      setKg('');
      setDeliveryAddress('');
      setNotes('');
      setCustomAmount('');
      setOrderData(null);

      // REFETCH THE OUTSTANDING BALANCE AFTER ORDER IS PLACED
      const statsRes = await api.get('/retailers/stats');
      if (statsRes.data.success) {
        setOutstanding(statsRes.data.data.outstandingBalance || 0);
      }

    } catch (error) {
      console.error('❌ Order placement error:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to place order');
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        setError('No response from server. Please check if backend is running.');
        console.error('Request:', error.request);
      } else {
        setError(error.message || 'Failed to place order. Please try again.');
      }
      
      setIsConfirmModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToOrders = () => {
    navigate('/retailer/orders');
  };

  const handlePlaceAnotherOrder = () => {
    setPlacedOrder(null);
    setSuccessMessage(null);
    setError(null);
    setKg('');
    setDeliveryAddress('');
    setNotes('');
    setCustomAmount('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading order page...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ✅ SUCCESS PAGE - Shows after order is placed
  // ============================================
  if (placedOrder) {
    console.log('🎉 Rendering success page with:', placedOrder);
    
    const totalAmountDisplay = typeof placedOrder.totalAmount === 'number' 
      ? placedOrder.totalAmount 
      : parseFloat(placedOrder.totalAmount) || 0;
    
    return (
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E8F5E9] rounded-full mb-4">
            <FiCheckCircle className="w-10 h-10 text-[#16834B]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Order Placed Successfully! 🎉</h1>
          <p className="text-sm text-[#6B716D] mt-1">Thank you for your order. We'll process it shortly.</p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#E5E8E6]">
            <div>
              <p className="text-xs text-[#6B716D]">Order Number</p>
              <p className="text-lg font-bold text-[#151A17]">{placedOrder.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6B716D]">Date & Time</p>
              <p className="text-sm font-medium text-[#151A17]">{placedOrder.createdAt}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
              <span className="text-sm text-[#6B716D]">📦 Quantity</span>
              <span className="font-medium text-[#151A17]">{placedOrder.kg} kg</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
              <span className="text-sm text-[#6B716D]">💰 Rate</span>
              <span className="font-medium text-[#151A17]">₹{pricePerKg}/kg</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
              <span className="text-sm text-[#6B716D]">💳 Payment Method</span>
              <span className="font-medium text-[#151A17]">{placedOrder.paymentMethod}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
              <span className="text-sm text-[#6B716D]">📍 Delivery Address</span>
              <span className="font-medium text-[#151A17] text-right max-w-[50%]">
                {placedOrder.deliveryAddress}
              </span>
            </div>
            {placedOrder.notes && placedOrder.notes !== 'No notes' && (
              <div className="flex items-start justify-between py-2 border-b border-[#F6F7F6]">
                <span className="text-sm text-[#6B716D]">📝 Notes</span>
                <span className="font-medium text-[#151A17] text-right max-w-[50%]">
                  {placedOrder.notes}
                </span>
              </div>
            )}
            {placedOrder.customAmount && placedOrder.customAmount > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
                <span className="text-sm text-[#6B716D]">💳 Partial Payment</span>
                <span className="font-medium text-[#3B6FD8]">
                  ₹{placedOrder.customAmount.toFixed(0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 mt-2 border-t-2 border-[#E5E8E6] pt-3">
              <span className="text-base font-semibold text-[#151A17]">Total Amount</span>
              <span className="text-xl font-bold text-[#111714]">
                ₹{totalAmountDisplay.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Updated Outstanding Card */}
        <div className="bg-[#E8F5E9] border border-[#16834B]/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="w-5 h-5 text-[#16834B]" />
            <div>
              <p className="text-sm font-medium text-[#151A17]">Updated Outstanding Balance</p>
              <p className="text-xl font-bold text-[#16834B]">
                {formatCurrency(outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-[#F6F7F6] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-[#151A17]">Order Status: Pending</p>
              <p className="text-xs text-[#6B716D]">We'll notify you when your order is confirmed</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            className="flex-1 py-3"
            onClick={handleGoToOrders}
          >
            <FiHome className="w-4 h-4 mr-2" />
            View My Orders
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 py-3"
            onClick={handlePlaceAnotherOrder}
          >
            <FiShoppingBag className="w-4 h-4 mr-2" />
            Place Another Order
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // PLACE ORDER FORM
  // ============================================
  return (
    <div className="max-w-2xl mx-auto">
      {/* Debug: Show placedOrder state */}
      {console.log('📊 Current placedOrder state:', placedOrder)}
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#151A17]">Place Order</h1>
        <p className="text-sm text-[#6B716D] mt-1">Just enter kilograms. That's it.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#FDEEEE] border border-[#D14343] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5 text-[#D14343]" />
            <p className="text-sm text-[#D14343]">{error}</p>
          </div>
        </div>
      )}

      {/* Data Error Message */}
      {dataError && (
        <div className="bg-[#FFF3CD] border border-[#FFC107] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5 text-[#D14343]" />
            <p className="text-sm text-[#151A17]">{dataError} Using default fallback values.</p>
          </div>
        </div>
      )}

      {/* Outstanding Warning - LIVE DATA */}
      <div className="bg-[#FDEEEE] border border-[#D14343] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5 text-[#D14343]" />
          <p className="text-sm text-[#D14343]">
            Outstanding Balance: <span className="font-bold">{formatCurrency(outstanding)}</span>
          </p>
        </div>
      </div>

      {/* KG Input */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <label className="block text-sm font-medium text-[#151A17] mb-2">
          How many KG?
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="e.g. 220"
            className="flex-1 px-4 py-3 text-lg border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            min="0"
            step="1"
            disabled={isLoading}
          />
          <span className="text-lg font-medium text-[#6B716D]">kg</span>
        </div>

        {/* Quick KG Options */}
        <div className="flex flex-wrap gap-2 mt-4">
          {quickKgOptions.map((option) => (
            <button
              key={option}
              onClick={() => setKg(option.toString())}
              className="px-4 py-2 bg-[#F6F7F6] rounded-lg text-sm text-[#151A17] hover:bg-[#E5E8E6] transition"
              disabled={isLoading}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <label className="block text-sm font-medium text-[#151A17] mb-2">
          Delivery Address (Optional)
        </label>
        <input
          type="text"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Enter delivery address"
          className="w-full px-4 py-3 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
          disabled={isLoading}
        />
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <label className="block text-sm font-medium text-[#151A17] mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special instructions..."
          className="w-full px-4 py-3 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition resize-none"
          rows="2"
          disabled={isLoading}
        />
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <h3 className="font-semibold text-[#151A17] mb-4">Payment Method</h3>
        
        {/* UPI Payment */}
        <button
          onClick={() => setSelectedPayment('upi')}
          className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition mb-3 ${
            selectedPayment === 'upi'
              ? 'border-[#111714] bg-[#F6F7F6]'
              : 'border-[#E5E8E6] hover:border-[#111714]'
          }`}
          disabled={isLoading}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selectedPayment === 'upi' ? 'bg-[#111714] text-white' : 'bg-[#F6F7F6]'
            }`}>
              <FiSmartphone className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#151A17]">UPI</p>
              <p className="text-sm text-[#6B716D]">₹{pricePerKg}/kg</p>
            </div>
          </div>
          {selectedPayment === 'upi' && (
            <FiCheck className="w-5 h-5 text-[#16834B]" />
          )}
        </button>

        {/* Cash Payment */}
        <button
          onClick={() => setSelectedPayment('cash')}
          className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition ${
            selectedPayment === 'cash'
              ? 'border-[#111714] bg-[#F6F7F6]'
              : 'border-[#E5E8E6] hover:border-[#111714]'
          }`}
          disabled={isLoading}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selectedPayment === 'cash' ? 'bg-[#111714] text-white' : 'bg-[#F6F7F6]'
            }`}>
              <FiDollarSign className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#151A17]">Cash</p>
              <p className="text-sm text-[#6B716D]">₹{pricePerKg}/kg</p>
            </div>
          </div>
          {selectedPayment === 'cash' && (
            <FiCheck className="w-5 h-5 text-[#16834B]" />
          )}
        </button>

        {/* Custom Amount - Only Show for UPI */}
        {kg && parseFloat(kg) > 0 && selectedPayment === 'upi' && (
          <div className="mt-4 p-4 bg-[#F6F7F6] rounded-lg">
            <p className="text-sm text-[#6B716D] mb-2">
              Total: {kg} kg × ₹{pricePerKg} = ₹{totalAmount.toFixed(0)}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#151A17]">Pay:</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 px-3 py-2 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
                min="0"
                step="1"
                max={totalAmount}
                disabled={isLoading}
              />
              <span className="text-sm text-[#6B716D]">Max: ₹{totalAmount.toFixed(0)}</span>
            </div>
            <p className="text-xs text-[#6B716D] mt-2">
              <FiAlertCircle className="inline w-3 h-3 mr-1" />
              Enter custom amount to pay partially, or leave empty for full payment
            </p>
          </div>
        )}

        {/* Show total for Cash without custom amount input */}
        {kg && parseFloat(kg) > 0 && selectedPayment === 'cash' && (
          <div className="mt-4 p-4 bg-[#F6F7F6] rounded-lg">
            <p className="text-sm text-[#6B716D]">
              Total: {kg} kg × ₹{pricePerKg} = <span className="font-bold text-[#151A17]">₹{totalAmount.toFixed(0)}</span>
            </p>
            <p className="text-xs text-[#6B716D] mt-1">
              <FiCheck className="inline w-3 h-3 text-[#16834B] mr-1" />
              Full payment will be collected on delivery
            </p>
          </div>
        )}
      </div>

      {/* Total & Place Order */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 sticky bottom-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-[#6B716D]">TOTAL</p>
            {/* ✅ FIXED: Using {pricePerKg} variable dynamically */}
            <p className="text-sm text-[#6B716D]">
              {kg && parseFloat(kg) > 0 
                ? `${kg} kg × ₹${pricePerKg}`
                : `0 kg × ₹${pricePerKg}`}
            </p>
            <p className="text-xs text-[#6B716D] mt-1">
              Payment: {selectedPayment === 'upi' ? 'UPI' : 'Cash'}
            </p>
          </div>
          <p className="text-3xl font-bold text-[#111714]">
            {kg && parseFloat(kg) > 0 
              ? `₹${totalAmount.toFixed(0)}`
              : '₹0'}
          </p>
        </div>
        
        {kg && parseFloat(kg) > 0 && totalAmount > outstanding && (
          <p className="text-sm text-[#D14343] mb-3">
            ⚠️ You have outstanding balance. Please clear your dues first.
          </p>
        )}
        
        <Button 
          className="w-full py-4 text-base"
          onClick={handlePlaceOrder}
          disabled={!kg || parseFloat(kg) <= 0 || totalAmount > outstanding || isLoading}
        >
          {isLoading ? (
            <>
              <FiLoader className="w-5 h-5 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <FiShoppingBag className="w-5 h-5 mr-2" />
              Place Order
            </>
          )}
        </Button>
      </div>

      {/* Order Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Your Order"
        description="Please review your order details before confirming"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmOrder} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4 mr-2" />
                  Confirm & Place Order
                </>
              )}
            </Button>
          </div>
        }
      >
        {orderData && (
          <div className="space-y-4">
            {/* Order Summary Card */}
            <div className="bg-[#F8FAF9] rounded-xl p-4 border border-[#E5E8E6]">
              <div className="flex items-center gap-2 mb-3">
                <FiPackage className="w-5 h-5 text-[#111714]" />
                <h4 className="font-semibold text-[#151A17]">Order Summary</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#E5E8E6]">
                  <span className="text-sm text-[#6B716D]">📦 Quantity</span>
                  <span className="font-medium text-[#151A17]">{orderData.kg} kg</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E5E8E6]">
                  <span className="text-sm text-[#6B716D]">💰 Rate</span>
                  <span className="font-medium text-[#151A17]">₹{orderData.rate_per_kg}/kg</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E5E8E6]">
                  <span className="text-sm text-[#6B716D]">💵 Total Amount</span>
                  <span className="text-lg font-bold text-[#111714]">
                    ₹{orderData.totalAmount.toFixed(0)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E5E8E6]">
                  <div className="flex items-center gap-2">
                    <FiCreditCard className="w-4 h-4 text-[#6B716D]" />
                    <span className="text-sm text-[#6B716D]">Payment Method</span>
                  </div>
                  <span className="font-medium text-[#151A17]">{orderData.paymentMethod}</span>
                </div>

                <div className="flex items-start justify-between py-2 border-b border-[#E5E8E6]">
                  <div className="flex items-center gap-2">
                    <FiMapPin className="w-4 h-4 text-[#6B716D] mt-1" />
                    <span className="text-sm text-[#6B716D]">Delivery Address</span>
                  </div>
                  <span className="font-medium text-[#151A17] text-right max-w-[60%]">
                    {orderData.deliveryAddress}
                  </span>
                </div>

                {orderData.notes !== 'No notes' && (
                  <div className="flex items-start justify-between py-2">
                    <div className="flex items-center gap-2">
                      <FiMessageSquare className="w-4 h-4 text-[#6B716D] mt-1" />
                      <span className="text-sm text-[#6B716D]">Notes</span>
                    </div>
                    <span className="font-medium text-[#151A17] text-right max-w-[60%]">
                      {orderData.notes}
                    </span>
                  </div>
                )}

                {orderData.customAmount && orderData.customAmount > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-[#3B6FD8]">
                      💳 Partial Payment: ₹{orderData.customAmount.toFixed(0)} of ₹{orderData.totalAmount.toFixed(0)}
                    </p>
                    <p className="text-xs text-[#6B716D] mt-1">
                      Remaining balance: ₹{(orderData.totalAmount - orderData.customAmount).toFixed(0)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="bg-[#F6F7F6] rounded-lg p-3 text-center">
              <p className="text-sm text-[#6B716D]">
                By confirming, you agree to place this order
              </p>
              <p className="text-xs text-[#6B716D] mt-1">
                Order will be processed after confirmation
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RetailerPlaceOrder;