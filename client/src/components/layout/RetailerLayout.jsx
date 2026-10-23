import { FiHome, FiShoppingBag, FiCreditCard, FiUser, FiPackage } from 'react-icons/fi';
import AppShell from './AppShell';

const RETAILER_NAV = [
  {
    items: [
      { path: '/retailer/dashboard', label: 'Dashboard', icon: FiHome },
      { path: '/retailer/place-order', label: 'Place Order', icon: FiShoppingBag },
      { path: '/retailer/orders', label: 'My Orders', icon: FiPackage },
      { path: '/retailer/payments', label: 'Payments', icon: FiCreditCard },
      { path: '/retailer/profile', label: 'Profile', icon: FiUser },
    ],
  },
];

const RetailerLayout = () => (
  <AppShell groups={RETAILER_NAV} portal="Retailer Portal" profilePath="/retailer/profile" />
);

export default RetailerLayout;
