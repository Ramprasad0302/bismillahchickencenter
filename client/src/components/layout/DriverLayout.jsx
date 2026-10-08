import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FiMenu, FiBell, FiUser } from 'react-icons/fi';
import DriverSidebar from './DriverSidebar';

const DriverLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F7F6]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[270px] flex-shrink-0">
        <DriverSidebar />
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
        <DriverSidebar onClose={() => setIsMobileSidebarOpen(false)} />
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
              <Link to="/driver/dashboard">
                <span className="text-sm font-semibold text-[#151A17] lg:hidden">
                  Driver Portal
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition relative">
                <FiBell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Link to="/driver/profile">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <FiUser className="w-5 h-5 text-gray-500" />
                </button>
              </Link>
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

export default DriverLayout;