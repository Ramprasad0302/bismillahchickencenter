import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import { getPaymentStatus } from '../../services/paymentService';

// The gateway sends the customer back here. The webhook is what actually
// updates the books, so this page polls until the transaction settles.
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // ~30 seconds

const PaymentResult = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get('ref');
  const cancelled = params.get('cancelled') === '1';

  const [status, setStatus] = useState(cancelled ? 'cancelled' : 'checking');
  const [txn, setTxn] = useState(null);
  const [message, setMessage] = useState(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('This link is missing a payment reference.');
      return;
    }
    if (cancelled) return;

    let timer;
    let active = true;

    const poll = async () => {
      try {
        const res = await getPaymentStatus(reference);
        if (!active) return;

        if (res.success) {
          setTxn(res.data);

          if (res.data.status === 'success') {
            setStatus('success');
            return;
          }
          if (res.data.status === 'failed' || res.data.status === 'cancelled') {
            setStatus(res.data.status);
            setMessage(res.data.failure_reason);
            return;
          }
        }

        pollCount.current += 1;
        if (pollCount.current >= MAX_POLLS) {
          setStatus('slow');
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (!active) return;
        console.error('Status check failed:', err);
        setStatus('error');
        setMessage(
          err.response?.data?.message || 'The payment status could not be checked.'
        );
      }
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reference, cancelled]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const views = {
    checking: {
      icon: <FiLoader className="w-14 h-14 text-[#16834B] mx-auto animate-spin" />,
      title: 'Confirming your payment',
      body: 'This takes a few seconds. Keep this page open.',
      tone: 'border-[#E5E8E6]',
    },
    success: {
      icon: <FiCheckCircle className="w-14 h-14 text-[#16834B] mx-auto" />,
      title: 'Payment received',
      body: txn
        ? `${formatCurrency(txn.amount)} has been applied to your account.`
        : 'Your payment has been applied to your account.',
      tone: 'border-[#16834B]',
    },
    cancelled: {
      icon: <FiXCircle className="w-14 h-14 text-[#6B716D] mx-auto" />,
      title: 'Payment cancelled',
      body: 'Nothing was charged. Your balance is unchanged.',
      tone: 'border-[#E5E8E6]',
    },
    failed: {
      icon: <FiXCircle className="w-14 h-14 text-[#D14343] mx-auto" />,
      title: 'Payment failed',
      body: message || 'The payment did not go through. Nothing was charged.',
      tone: 'border-[#D14343]',
    },
    slow: {
      icon: <FiAlertCircle className="w-14 h-14 text-[#C9821B] mx-auto" />,
      title: 'Still processing',
      body: 'Your bank is taking longer than usual. Check the payments page in a few minutes — if the amount was debited, it will appear there.',
      tone: 'border-[#E5E8E6]',
    },
    error: {
      icon: <FiAlertCircle className="w-14 h-14 text-[#D14343] mx-auto" />,
      title: 'Could not check the payment',
      body: message || 'Open the payments page to see your current balance.',
      tone: 'border-[#D14343]',
    },
  };

  const view = views[status] || views.checking;

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className={`bg-white rounded-xl border-2 ${view.tone} p-8 text-center`}>
        {view.icon}
        <h1 className="text-xl font-semibold text-[#151A17] mt-4">{view.title}</h1>
        <p className="text-sm text-[#6B716D] mt-2">{view.body}</p>

        {reference && (
          <p className="text-xs text-[#6B716D] mt-4 font-mono">Ref {reference}</p>
        )}

        {status !== 'checking' && (
          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={() => navigate('/retailer/payments')}
              className="w-full px-4 py-2.5 rounded-lg bg-[#16834B] text-white font-medium hover:bg-[#116339] transition"
            >
              Back to payments
            </button>
            <Link
              to="/retailer/dashboard"
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E8E6] text-[#151A17] font-medium hover:bg-[#F6F7F6] transition"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
