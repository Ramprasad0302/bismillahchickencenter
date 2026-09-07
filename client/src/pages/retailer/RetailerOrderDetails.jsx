import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiPackage, 
  FiCreditCard, 
  FiTruck,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiCircle,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { startCheckout, redirectToGateway } from '../../services/paymentService';

const RetailerOrderDetails = () => {
  // ✅ Now reading the Numeric ID (e.g., 4, 11, etc.)
  const { id } = useParams(); 
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Make Payment button state
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // ✅ Fetch order details from API
  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📋 Fetching order ${id} details...`);
      const response = await api.get(`/orders/${id}`);
      console.log('✅ Order details:', response.data);
      
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to fetch order');
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred while fetching order details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Send the retailer to the payment gateway to clear this order's balance.
  const handleMakePayment = async () => {
    setPaymentError(null);
    setIsStartingPayment(true);
    try {
      const res = await startCheckout({ orderId: order.id });
      if (res.success && res.data?.redirect_url) {
        redirectToGateway(res.data.redirect_url);
        return; // leaving the page
      }
      setPaymentError(res.message || 'Could not start the payment. Please try again.');
    } catch (err) {
      console.error('❌ Error starting checkout:', err);
      setPaymentError(err.response?.data?.message || 'Could not start the payment. Please try again.');
    } finally {
      setIsStartingPayment(false);
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

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status color ✅ PRIORITIZE trip_orders delivered_status
  const getStatusInfo = (status, deliveredStatus) => {
    // If the trip_orders table says delivered, show Delivered!
    if (deliveredStatus === 'delivered') {
      return { color: 'success', label: 'Delivered' };
    }

    // Otherwise, fallback to the order status
    const statusMap = {
      'pending': { color: 'warning', label: 'Pending' },
      'confirmed': { color: 'primary', label: 'Confirmed' },
      'processing': { color: 'info', label: 'Processing' },
      'out_for_delivery': { color: 'info', label: 'En route' },
      'delivered': { color: 'success', label: 'Delivered' },
      'cancelled': { color: 'error', label: 'Cancelled' }
    };
    return statusMap[status] || { color: 'default', label: status || 'Unknown' };
  };

  // Get payment status color
  const getPaymentStatusInfo = (status) => {
    const paymentMap = {
      'paid': { color: 'success', label: 'Paid' },
      'partial': { color: 'warning', label: 'Partial' },
      'pending': { color: 'error', label: 'Pending' }
    };
    return paymentMap[status] || { color: 'default', label: status || 'Unknown' };
  };

  // Get timeline steps based on order status
  const getTimeline = (status, deliveredStatus) => {
    // Determine the actual status to use for the timeline
    const effectiveStatus = deliveredStatus === 'delivered' ? 'delivered' : status;

    const steps = [
      { status: 'Order Placed', key: 'pending' },
      { status: 'Confirmed', key: 'confirmed' },
      { status: 'Processing', key: 'processing' },
      { status: 'Out for Delivery', key: 'out_for_delivery' },
      { status: 'Delivered', key: 'delivered' }
    ];

    const statusOrder = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(effectiveStatus);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      time: index <= currentIndex ? 'Completed' : 'Pending'
    }));
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 text-[#111714] animate-spin" />
        <p className="mt-4 text-[#6B716D]">Loading order details...</p>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#D14343]" />
        <p className="mt-4 text-[#D14343] font-medium">{error}</p>
        <Link to="/retailer/orders">
          <Button variant="outline" className="mt-4">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  // ✅ If no order found
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#6B716D]" />
        <p className="mt-4 text-[#6B716D]">Order not found</p>
        <Link to="/retailer/orders">
          <Button variant="outline" className="mt-4">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  // 🟢 CHECK: Read delivered_status from trip_orders
  const statusInfo = getStatusInfo(order.order_status, order.delivered_status);
  const paymentInfo = getPaymentStatusInfo(order.payment_status);
  const timeline = getTimeline(order.order_status, order.delivered_status);
  const balanceDue = parseFloat(order.balance) || 0;

  return (
    <div>
      {/* Back Button */}
      <Link to="/retailer/orders" className="inline-flex items-center gap-2 text-[#6B716D] hover:text-[#151A17] mb-6 transition">
        <FiArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Order #{order.order_number}</h1>
          <p className="text-sm text-[#6B716D] mt-1">
            Placed on {formatDate(order.order_date)} at {formatTime(order.order_date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
          <Badge variant={paymentInfo.color}>{paymentInfo.label}</Badge>
        </div>
      </div>

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
            <h3 className="font-semibold text-[#151A17] mb-4">Order Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F6F7F6] rounded-lg p-3">
                <p className="text-xs text-[#6B716D]">Total KG</p>
                <p className="text-lg font-semibold text-[#151A17]">{order.kg_ordered} kg</p>
              </div>
              <div className="bg-[#F6F7F6] rounded-lg p-3">
                <p className="text-xs text-[#6B716D]">Delivered KG</p>
                <p className="text-lg font-semibold text-[#151A17]">{order.kg_delivered || 0} kg</p>
              </div>
              <div className="bg-[#F6F7F6] rounded-lg p-3">
                <p className="text-xs text-[#6B716D]">Rate per KG</p>
                <p className="text-lg font-semibold text-[#151A17]">₹{order.rate_per_kg}</p>
              </div>
              <div className="bg-[#F6F7F6] rounded-lg p-3">
                <p className="text-xs text-[#6B716D]">Total Amount</p>
                <p className="text-lg font-semibold text-[#151A17]">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
            <h3 className="font-semibold text-[#151A17] mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {timeline.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  {step.completed ? (
                    <FiCheckCircle className="w-5 h-5 text-[#16834B] mt-0.5" />
                  ) : (
                    <FiCircle className="w-5 h-5 text-[#6B716D] mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${step.completed ? 'text-[#151A17]' : 'text-[#6B716D]'}`}>
                      {step.status}
                    </p>
                    <p className="text-xs text-[#6B716D]">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Payment & Delivery */}
        <div className="space-y-6">
          {/* Payment Details */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
            <h3 className="font-semibold text-[#151A17] mb-4">Payment Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B716D]">Total Amount</span>
                <span className="font-medium">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B716D]">Paid Amount</span>
                <span className="font-medium text-[#16834B]">{formatCurrency(order.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-[#6B716D]">Balance</span>
                <span className="text-[#D14343]">{formatCurrency(order.balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B716D]">Payment Method</span>
                <span className="font-medium capitalize">{order.payment_method || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B716D]">Payment Status</span>
                <Badge variant={paymentInfo.color}>{paymentInfo.label}</Badge>
              </div>
              {order.upi_transaction_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B716D]">UPI Transaction</span>
                  <span className="font-medium text-xs">{order.upi_transaction_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
            <h3 className="font-semibold text-[#151A17] mb-4">Delivery Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FiPackage className="w-4 h-4 text-[#6B716D] mt-0.5" />
                <div>
                  <p className="text-sm text-[#6B716D]">Delivery Address</p>
                  <p className="text-sm font-medium text-[#151A17]">
                    {order.delivery_address || 'Not provided'}
                  </p>
                </div>
              </div>
              {/* ✅ Show delivered date if it exists */}
              {order.delivered_date && (
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-4 h-4 text-[#16834B]" />
                  <div>
                    <p className="text-sm text-[#6B716D]">Delivered On</p>
                    <p className="text-sm font-medium text-[#151A17]">
                      {formatDate(order.delivered_date)}
                    </p>
                  </div>
                </div>
              )}
              {order.notes && (
                <div className="flex items-start gap-3">
                  <FiClock className="w-4 h-4 text-[#6B716D] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B716D]">Notes</p>
                    <p className="text-sm font-medium text-[#151A17]">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
            <h3 className="font-semibold text-[#151A17] mb-4">Actions</h3>

            {paymentError && (
              <div className="mb-3 p-3 bg-[#FDEEEE] border border-[#D14343]/20 rounded-lg flex items-start gap-2">
                <FiAlertCircle className="w-4 h-4 text-[#D14343] mt-0.5 shrink-0" />
                <p className="text-xs text-[#D14343]">{paymentError}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {balanceDue > 0 ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleMakePayment}
                  disabled={isStartingPayment}
                >
                  {isStartingPayment ? (
                    <>
                      <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                      Starting payment...
                    </>
                  ) : (
                    <>
                      <FiCreditCard className="w-4 h-4 mr-2" />
                      Pay {formatCurrency(balanceDue)}
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#EAF6EF] text-[#16834B] rounded-lg text-sm font-medium">
                  <FiCheckCircle className="w-4 h-4" />
                  Fully paid
                </div>
              )}
              <Link to="/retailer/place-order" className="w-full">
                <Button variant="outline" className="w-full">
                  <FiPackage className="w-4 h-4 mr-2" />
                  Reorder
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerOrderDetails;