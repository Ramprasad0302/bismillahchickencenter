import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  FiHome,
  FiDollarSign,
  FiUsers,
  FiShoppingBag,
  FiTruck,
  FiPackage,
  FiFileText,
  FiCreditCard,
  FiPieChart,
  FiSettings,
  FiLogOut,
  FiUserPlus,
  FiBriefcase,
  FiCheckCircle,
  FiLoader,
  FiClipboard
} from 'react-icons/fi';

const Sidebar = ({ onClose }) => {
  const { logout, user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || 'Admin');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // ✅ FETCH FRESH PROFILE DATA ON MOUNT
  useEffect(() => {
    const fetchFreshProfile = async () => {
      setIsLoadingProfile(true);
      try {
        // This calls your newly fixed authController
        const response = await api.get('/auth/me');
        
        if (response.data.success && response.data.data) {
          const freshUser = response.data.data;
          
          // 1. Update the sidebar state
          setDisplayName(freshUser.name || 'Admin');
          
          // 2. Update localStorage so the Header also updates instantly
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            parsedUser.name = freshUser.name;
            parsedUser.phone = freshUser.phone; // Update phone too just in case
            localStorage.setItem('user', JSON.stringify(parsedUser));
            
            // 3. Force a refresh of the context across the whole app
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (error) {
        // If the API call fails (network issues), just fallback to the existing context name
        console.log('ℹ️ Could not refresh profile from server. Using local fallback.');
        setDisplayName(user?.name || 'Admin');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchFreshProfile();
  }, [user?.name]); // Re-run if context user changes

  const navItems = [
    { 
      category: 'Overview',
      items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
      ]
    },
    {
      category: 'Operations',
      items: [
        { path: '/admin/pricing', label: 'Pricing', icon: FiDollarSign },
        { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
        { path: '/admin/deliveries', label: 'Deliveries', icon: FiTruck },
        { path: '/admin/trip-overview', label: 'Trip Overview', icon: FiTruck },
      ]
    },
    {
      category: 'People',
      items: [
        { path: '/admin/customers', label: 'Customers', icon: FiUsers },
        { path: '/admin/users', label: 'Users', icon: FiUserPlus },
        { path: '/admin/staff', label: 'Staff', icon: FiBriefcase },
        { path: '/admin/vehicles', label: 'Vehicles', icon: FiPackage },
      ]
    },
    {
      category: 'Finance',
      items: [
        { path: '/admin/ledgers', label: 'Ledgers', icon: FiFileText },
        { path: '/admin/expenses', label: 'Expenses', icon: FiClipboard },
        { path: '/admin/salaries', label: 'Salaries', icon: FiDollarSign },
        { path: '/admin/payments', label: 'Payments', icon: FiCreditCard },
        { path: '/admin/cash-verification', label: 'Cash Verification', icon: FiCheckCircle },
        { path: '/admin/reports', label: 'Reports', icon: FiPieChart },
      ]
    },
    {
      category: 'System',
      items: [
        { path: '/admin/settings', label: 'Settings', icon: FiSettings },
      ]
    },
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
        {navItems.map((category) => (
          <div key={category.category} className="mb-6">
            <p className="px-4 text-[10px] font-medium tracking-[0.2em] text-white/30 uppercase mb-2">
              {category.category}
            </p>
            <div className="space-y-1">
              {category.items.map((item) => (
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
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {isLoadingProfile ? (
                <FiLoader className="animate-spin w-4 h-4" />
              ) : (
                displayName?.[0] || 'A'
              )}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {isLoadingProfile ? (
                <span className="flex items-center gap-2">
                  <FiLoader className="animate-spin w-3 h-3" /> Loading...
                </span>
              ) : (
                displayName || 'Admin'
              )}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || 'Administrator'}</p>
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

export default Sidebar;