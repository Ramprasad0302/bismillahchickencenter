import { FiHome, FiTruck, FiDollarSign, FiClock, FiUser } from 'react-icons/fi';
import AppShell from './AppShell';

const DRIVER_NAV = [
  {
    items: [
      { path: '/driver/dashboard', label: 'Dashboard', icon: FiHome },
      { path: '/driver/deliveries', label: 'My Trips', icon: FiTruck },
      { path: '/driver/collections', label: 'Collections', icon: FiDollarSign },
      { path: '/driver/history', label: 'History', icon: FiClock },
      { path: '/driver/profile', label: 'Profile', icon: FiUser },
    ],
  },
];

const DriverLayout = () => (
  <AppShell groups={DRIVER_NAV} portal="Driver Portal" profilePath="/driver/profile" />
);

export default DriverLayout;
