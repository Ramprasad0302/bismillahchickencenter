import {
  FiHome,
  FiUsers,
  FiShoppingBag,
  FiTruck,
  FiPackage,
  FiFileText,
  FiCreditCard,
  FiPieChart,
  FiSettings,
  FiUserPlus,
  FiBriefcase,
  FiCheckCircle,
  FiClipboard,
  FiMap,
  FiTag,
  FiAward,
} from 'react-icons/fi';
import AppShell from './AppShell';

const ADMIN_NAV = [
  {
    category: 'Overview',
    items: [{ path: '/admin/dashboard', label: 'Dashboard', icon: FiHome }],
  },
  {
    category: 'Operations',
    items: [
      { path: '/admin/pricing', label: 'Pricing', icon: FiTag },
      { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
      { path: '/admin/deliveries', label: 'Deliveries', icon: FiTruck },
      { path: '/admin/trip-overview', label: 'Trip Overview', icon: FiMap },
    ],
  },
  {
    category: 'People',
    items: [
      { path: '/admin/customers', label: 'Customers', icon: FiUsers },
      { path: '/admin/users', label: 'Users', icon: FiUserPlus },
      { path: '/admin/staff', label: 'Staff', icon: FiBriefcase },
      { path: '/admin/vehicles', label: 'Vehicles', icon: FiPackage },
    ],
  },
  {
    category: 'Finance',
    items: [
      { path: '/admin/ledgers', label: 'Ledgers', icon: FiFileText },
      { path: '/admin/expenses', label: 'Expenses', icon: FiClipboard },
      { path: '/admin/salaries', label: 'Salaries', icon: FiAward },
      { path: '/admin/payments', label: 'Payments', icon: FiCreditCard },
      { path: '/admin/cash-verification', label: 'Cash Verification', icon: FiCheckCircle },
      { path: '/admin/reports', label: 'Reports', icon: FiPieChart },
    ],
  },
  {
    category: 'System',
    items: [{ path: '/admin/settings', label: 'Settings', icon: FiSettings }],
  },
];


const DashboardLayout = () => (
  <AppShell groups={ADMIN_NAV} portal="Admin Portal" profilePath="/admin/settings" refreshProfile />
);

export default DashboardLayout;
