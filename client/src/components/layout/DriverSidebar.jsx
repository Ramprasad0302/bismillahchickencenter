import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiTruck,
  FiDollarSign,
  FiUser,
  FiLogOut,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';

const DriverSidebar = ({ onClose }) => {
  const { logout, user } = useAuth();

  const navItems = [
    { path: '/driver/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/driver/deliveries', label: 'My Trips', icon: FiTruck },
    { path: '/driver/collections', label: 'Collections', icon: FiDollarSign },
    { path: '/driver/history', label: 'History', icon: FiClock },
    { path: '/driver/profile', label: 'Profile', icon: FiUser },
  ];

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  return (
    <div className="h-full bg-[#111714] text-white flex flex-col">
      {/* Logo */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#111714] font-bold text-lg">
            B
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em]">BISMILLAH</h2>
            <p className="text-[8px] tracking-[0.3em] text-white/40">CHICKEN CENTER</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{user?.name?.[0] || 'D'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Driver'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || 'Driver'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Logout"
          >
            <FiLogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverSidebar;