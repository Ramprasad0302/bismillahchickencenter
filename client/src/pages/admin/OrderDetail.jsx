import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiLoader,
  FiAlertCircle,
  FiUser,
  FiPhone,
  FiMapPin,
  FiTruck,
  FiBriefcase,
  FiCalendar,
  FiPackage,
  FiDollarSign,
  FiFileText,
  FiCreditCard,
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import api from '../../services/api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatNumber = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) {
    opts.hour = '2-digit';
    opts.minute = '2-digit';
  }
  return new Date(value).toLocaleDateString('en-IN', opts);
};

const STATUS_VARIANT = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

const PAYMENT_STATUS_VARIANT = {
  paid: 'success',
  partial: 'warning',
  pending: 'danger',
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
      } else {
        setError('Could not load this order.');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.message || 'Could not load this order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiLoader className="w-10 h-10 animate-spin text-[#16834B]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/admin/orders')}
          className="flex items-center gap-2 text-sm text-[#6B716D] hover:text-[#151A17] mb-4"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Orders
        </button>
        <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center">
          <FiAlertCircle className="w-12 h-12 text-[#D14343] mx-auto mb-3" />
          <p className="text-[#D14343] font-medium">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  const isDelivered = order.order_status === 'delivered';

  // Whether the delivered quantity differs from what was originally ordered
  // -- worth calling out since it changes the bill from what the retailer
  // expected when they placed the order.
  const kgOrdered = parseFloat(order.kg_ordered) || 0;
  const kgDelivered = parseFloat(order.kg_delivered) || 0;
  const kgDiff = parseFloat((kgDelivered - kgOrdered).toFixed(2));
  const hensOrdered = order.hens_ordered ? parseFloat(order.hens_ordered) : null;
  const hensDelivered = parseFloat(order.hens_delivered) || 0;
  const hensDiff = hensOrdered !== null ? hensDelivered - hensOrdered : null;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button
        onClick={() => navigate('/admin/orders')}
        className="flex items-center gap-2 text-sm text-[#6B716D] hover:text-[#151A17] mb-4"
      >
        <FiArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#151A17]">{order.order_number}</h1>
            <Badge variant={STATUS_VARIANT[order.order_status] || 'info'}>
              {order.order_status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-sm text-[#6B716D] mt-1 flex items-center gap-1.5">
            <FiCalendar className="w-3.5 h-3.5" /> Ordered {formatDate(order.order_date, true)}
            {order.delivered_date && (
              <span> · Delivered {formatDate(order.delivered_date)}</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6B716D]">Total Amount</p>
          <p className="text-2xl font-bold text-[#151A17]">{formatCurrency(order.total_amount)}</p>
        </div>
      </div>

      {/* Retailer */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <h3 className="font-semibold text-[#151A17] mb-4">Retailer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <FiUser className="w-4 h-4 text-[#6B716D]" />
            <div>
              <p className="text-xs text-[#6B716D]">Shop</p>
              <p className="font-medium text-[#151A17]">{order.shop_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FiPhone className="w-4 h-4 text-[#6B716D]" />
            <div>
              <p className="text-xs text-[#6B716D]">Phone</p>
              <p className="font-medium text-[#151A17]">{order.retailer_phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FiMapPin className="w-4 h-4 text-[#6B716D]" />
            <div>
              <p className="text-xs text-[#6B716D]">Delivery Address</p>
              <p className="font-medium text-[#151A17]">{order.delivery_address || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quantity: ordered vs delivered */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <h3 className="font-semibold text-[#151A17] mb-4">Quantity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F6F7F6] rounded-xl">
            <p className="text-xs text-[#6B716D] mb-2">ORDERED</p>
            <p className="text-lg font-bold text-[#151A17]">
              {hensOrdered !== null ? `${formatNumber(hensOrdered)} hens · ` : ''}
              {formatNumber(kgOrdered)} kg
            </p>
          </div>
          <div className="p-4 bg-[#F6F7F6] rounded-xl">
            <p className="text-xs text-[#6B716D] mb-2">
              {isDelivered ? 'DELIVERED' : 'TO BE DELIVERED'}
            </p>
            <p className="text-lg font-bold text-[#151A17]">
              {isDelivered && hensDelivered > 0 ? `${formatNumber(hensDelivered)} hens · ` : ''}
              {formatNumber(isDelivered ? kgDelivered : kgOrdered)} kg
            </p>
          </div>
        </div>

        {isDelivered && (Math.abs(kgDiff) >= 0.01 || (hensDiff !== null && Math.abs(hensDiff) >= 1)) && (
          <div className="mt-4 p-3 bg-[#FFF8E6] border border-[#E0A32E] rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 text-[#E0A32E] mt-0.5 shrink-0" />
            <p className="text-sm text-[#151A17]">
              Delivered quantity differs from what was ordered by{' '}
              <span className="font-semibold">
                {kgDiff > 0 ? '+' : ''}{formatNumber(kgDiff)} kg
              </span>
              {hensDiff !== null && (
                <>
                  {' '}and{' '}
                  <span className="font-semibold">
                    {hensDiff > 0 ? '+' : ''}{formatNumber(hensDiff)} hens
                  </span>
                </>
              )}
              . The bill below is calculated on the delivered quantity.
            </p>
          </div>
        )}
      </div>

      {/* Delivery / trip info */}
      {(order.trip_number || order.driver_name) && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <h3 className="font-semibold text-[#151A17] mb-4">Delivery</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <FiTruck className="w-4 h-4 text-[#6B716D]" />
              <div>
                <p className="text-xs text-[#6B716D]">Trip</p>
                <p className="font-medium text-[#151A17]">{order.trip_number || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiUser className="w-4 h-4 text-[#6B716D]" />
              <div>
                <p className="text-xs text-[#6B716D]">Driver</p>
                <p className="font-medium text-[#151A17]">{order.driver_name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiBriefcase className="w-4 h-4 text-[#6B716D]" />
              <div>
                <p className="text-xs text-[#6B716D]">Loaded From</p>
                <p className="font-medium text-[#151A17]">{order.company_name || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financials */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
        <h3 className="font-semibold text-[#151A17] mb-4 flex items-center gap-2">
          <FiDollarSign className="w-4 h-4" /> Financials
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
            <span className="text-sm text-[#6B716D]">Rate per KG</span>
            <span className="font-medium text-[#151A17]">₹{formatNumber(order.rate_per_kg)}/kg</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
            <span className="text-sm text-[#6B716D]">Subtotal</span>
            <span className="font-medium text-[#151A17]">{formatCurrency(order.subtotal)}</span>
          </div>
          {parseFloat(order.delivery_charge) > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
              <span className="text-sm text-[#6B716D]">Delivery Charge</span>
              <span className="font-medium text-[#151A17]">+{formatCurrency(order.delivery_charge)}</span>
            </div>
          )}
          {parseFloat(order.discount) > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
              <span className="text-sm text-[#6B716D]">Discount</span>
              <span className="font-medium text-[#D14343]">-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
            <span className="text-sm font-semibold text-[#151A17]">Total Amount</span>
            <span className="font-bold text-[#151A17]">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#F6F7F6]">
            <span className="text-sm text-[#6B716D]">Paid Amount</span>
            <span className="font-medium text-[#16834B]">{formatCurrency(order.paid_amount)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-[#151A17]">Balance Due</span>
            <span className={`font-bold ${parseFloat(order.balance) > 0 ? 'text-[#D14343]' : 'text-[#16834B]'}`}>
              {formatCurrency(order.balance)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#E5E8E6]">
          <span className="text-sm text-[#6B716D]">Payment:</span>
          <Badge variant="info">{order.payment_method?.toUpperCase() || 'PENDING'}</Badge>
          <Badge variant={PAYMENT_STATUS_VARIANT[order.payment_status] || 'warning'}>
            {order.payment_status || 'pending'}
          </Badge>
          {parseFloat(order.cash_collected) > 0 && (
            <span className="text-sm text-[#6B716D]">
              · {formatCurrency(order.cash_collected)} cash collected by driver
            </span>
          )}
        </div>
      </div>

      {/* Online payment transactions */}
      {order.transactions && order.transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <h3 className="font-semibold text-[#151A17] mb-4 flex items-center gap-2">
            <FiCreditCard className="w-4 h-4" /> Online Payment Attempts
          </h3>
          <div className="space-y-2">
            {order.transactions.map((tx, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#F6F7F6] rounded-lg text-sm"
              >
                <div>
                  <p className="font-medium text-[#151A17]">{tx.reference}</p>
                  <p className="text-xs text-[#6B716D]">
                    {tx.provider} · {formatDate(tx.created_at, true)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#151A17]">{formatCurrency(tx.amount)}</p>
                  <Badge variant={tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <h3 className="font-semibold text-[#151A17] mb-2 flex items-center gap-2">
            <FiFileText className="w-4 h-4" /> Notes
          </h3>
          <p className="text-sm text-[#151A17]">{order.notes}</p>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;