import api from './api';

// What the retailer owes right now, plus the bills behind it.
export const getPaymentSummary = async () => {
  const { data } = await api.get('/payments/summary');
  return data;
};

// Payment history for the logged-in retailer.
export const getPaymentHistory = async () => {
  const { data } = await api.get('/payments');
  return data;
};

// Start a checkout. Returns { reference, amount, redirect_url }.
// `amount` is optional — leave it out to pay the whole balance.
export const startCheckout = async ({ amount, orderId } = {}) => {
  const { data } = await api.post('/payments/checkout', {
    amount,
    order_id: orderId,
  });
  return data;
};

// Poll after coming back from the gateway.
export const getPaymentStatus = async (reference) => {
  const { data } = await api.get(`/payments/status/${reference}`);
  return data;
};

// Hand the browser to the gateway's hosted page.
// Works unchanged for Razorpay Payment Links later.
export const redirectToGateway = (url) => {
  window.location.href = url;
};
