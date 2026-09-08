import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FiMenu, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  // Close the profile dropdown when clicking anywhere outside it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F7F6]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[270px] flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 w-[280px] h-full transition-transform duration-300 lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E8E6] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-[#151A17]">Dashboard</h1>
            </div>

            {/* Profile menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                className="w-9 h-9 rounded-full bg-[#F6F7F6] flex items-center justify-center hover:bg-gray-200 transition"
                onClick={() => setIsProfileMenuOpen((open) => !open)}
              >
                <FiUser className="w-5 h-5 text-gray-600" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E5E8E6] shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#E5E8E6]">
                    <p className="text-sm font-medium text-[#151A17] truncate">
                      {user?.name || 'Admin'}
                    </p>
                    <p className="text-xs text-[#6B716D] capitalize">{user?.role || 'Administrator'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#151A17] hover:bg-[#F6F7F6] transition"
                  >
                    <FiSettings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#D14343] hover:bg-[#FDEEEE] transition"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;