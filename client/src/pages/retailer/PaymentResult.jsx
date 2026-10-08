import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import { getPaymentStatus, cancelCheckout } from '../../services/paymentService';

// The gateway sends the customer back here. The webhook is what actually
// updates the books, so this page polls until the transaction settles.
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // ~30 seconds

const PaymentResult = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get('ref');
  const cancelled = params.get('cancelled') === '1';

  // Whatever happens on this page (success, failure, or cancel) is the real
  // outcome of the checkout. Clear the "did the retailer come back without
  // finishing?" marker Place Order set before redirecting here, so a later
  // visit to Place Order can never mistake a completed trip through this
  // page for an abandoned one.
  useEffect(() => {
    sessionStorage.removeItem('bismilla_pending_checkout');
  }, []);

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

    let timer;
    let active = true;

    if (cancelled) {
      // Stripe/Razorpay don't send a webhook for "customer clicked back" —
      // the session just sits open for hours. Tell the backend right away so
      // an order created for this attempt is cancelled instead of left
      // pending.
      cancelCheckout(reference).catch((err) => {
        console.error('Cancel notify failed:', err);
      });
      return;
    }

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
      icon: <FiLoader className="w-14 h-14 text-success mx-auto animate-spin" />,
      title: 'Confirming your payment',
      body: 'This takes a few seconds. Keep this page open.',
      tone: 'border-line',
    },
    success: {
      icon: <FiCheckCircle className="w-14 h-14 text-success mx-auto" />,
      title: 'Payment received',
      body: txn
        ? `${formatCurrency(txn.amount)} has been applied to your account.`
        : 'Your payment has been applied to your account.',
      tone: 'border-success',
    },
    cancelled: {
      icon: <FiXCircle className="w-14 h-14 text-muted mx-auto" />,
      title: 'Payment cancelled',
      body: 'Nothing was charged. Your balance is unchanged.',
      tone: 'border-line',
    },
    failed: {
      icon: <FiXCircle className="w-14 h-14 text-danger mx-auto" />,
      title: 'Payment failed',
      body: message || 'The payment did not go through. Nothing was charged.',
      tone: 'border-danger',
    },
    slow: {
      icon: <FiAlertCircle className="w-14 h-14 text-[#C9821B] mx-auto" />,
      title: 'Still processing',
      body: 'Your bank is taking longer than usual. Check the payments page in a few minutes — if the amount was debited, it will appear there.',
      tone: 'border-line',
    },
    error: {
      icon: <FiAlertCircle className="w-14 h-14 text-danger mx-auto" />,
      title: 'Could not check the payment',
      body: message || 'Open the payments page to see your current balance.',
      tone: 'border-danger',
    },
  };

  const view = views[status] || views.checking;

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className={`bg-white rounded-xl border-2 ${view.tone} p-8 text-center`}>
        {view.icon}
        <h1 className="text-xl font-semibold text-ink mt-4">{view.title}</h1>
        <p className="text-sm text-muted mt-2">{view.body}</p>

        {reference && (
          <p className="text-xs text-muted mt-4 font-mono">Ref {reference}</p>
        )}

        {status !== 'checking' && (
          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={() => navigate('/retailer/payments')}
              className="w-full px-4 py-2.5 rounded-lg bg-success text-white font-medium hover:bg-success-dark transition"
            >
              Back to payments
            </button>
            <Link
              to="/retailer/dashboard"
              className="w-full px-4 py-2.5 rounded-lg border border-line text-ink font-medium hover:bg-cream transition"
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