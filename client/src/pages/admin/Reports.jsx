import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import { 
  FiFileText, 
  FiDownload, 
  FiPrinter, 
  FiLoader, 
  FiAlertCircle 
} from 'react-icons/fi';
import api from '../../services/api';

const Reports = () => {
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  
  // Live Data States
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    outstanding: 0
  });
  const [orders, setOrders] = useState([]);
  const [retailers, setRetailers] = useState([]);

  // ============================================
  // FETCH REPORT DATA
  // ============================================
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/reports/data?range=${dateRange}`);
      if (response.data.success) {
        setStats(response.data.data.stats);
        setRetailers(response.data.data.retailers);
        setOrders(response.data.data.orders);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  // Refetch when date range changes
  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  // ============================================
  // HANDLE EXPORT (EXCEL / CSV)
  // ============================================
  const handleExport = async (type) => {
    setExporting(true);
    try {
      // Create a hidden anchor tag to download the file
      const response = await api.get(`/reports/export?range=${dateRange}&type=${type}`, {
        responseType: 'blob', // Important for downloading files
      });

      // Create a URL from the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sales_Report_${dateRange}.${type === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // HELPER
  // ============================================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Reports</h1>
          <p className="text-sm text-[#6B716D]">Generate and view business reports</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            icon={FiDownload} 
            onClick={() => handleExport('excel')}
            disabled={loading || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button 
            variant="outline" 
            icon={FiPrinter} 
            onClick={() => handleExport('csv')}
            disabled={loading || exporting}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['today', 'yesterday', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                dateRange === range
                  ? 'bg-[#111714] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-10">
          <FiLoader className="w-8 h-8 animate-spin text-[#16834B]" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-[#D14343]" />
          <p className="text-sm text-[#D14343]">{error}</p>
        </div>
      )}

      {/* Report Cards */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
              <p className="text-sm text-[#6B716D]">Total Sales</p>
              <p className="text-2xl font-semibold text-[#151A17]">{formatCurrency(stats.totalSales)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
              <p className="text-sm text-[#6B716D]">Total Orders</p>
              <p className="text-2xl font-semibold text-[#151A17]">{stats.totalOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
              <p className="text-sm text-[#6B716D]">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-[#151A17]">{formatCurrency(stats.avgOrderValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
              <p className="text-sm text-[#6B716D]">Outstanding</p>
              <p className="text-2xl font-semibold text-[#151A17]">{formatCurrency(stats.outstanding)}</p>
            </div>
          </div>

          {/* Outstanding Retailers Table */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-[#E5E8E6]">
              <h2 className="text-lg font-semibold text-[#151A17]">Retailers with Outstanding Balance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F7F6]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Shop Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E6]">
                  {retailers.length > 0 ? (
                    retailers.map((retailer) => (
                      <tr key={retailer.id} className="hover:bg-[#F6F7F6] transition">
                        <td className="px-6 py-4 text-sm font-medium text-[#151A17]">{retailer.shop_name}</td>
                        <td className="px-6 py-4 text-sm text-[#6B716D]">{retailer.owner_name}</td>
                        <td className="px-6 py-4 text-sm text-[#6B716D]">{retailer.phone}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-[#D14343]">
                          {formatCurrency(retailer.outstanding)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-[#6B716D] text-sm">
                        No outstanding balances found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8E6]">
              <h2 className="text-lg font-semibold text-[#151A17]">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F7F6]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Kg</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E6]">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.order_number} className="hover:bg-[#F6F7F6] transition">
                        <td className="px-6 py-4 text-sm font-medium text-[#151A17]">{order.order_number}</td>
                        <td className="px-6 py-4 text-sm text-[#151A17]">{order.shop_name}</td>
                        <td className="px-6 py-4 text-sm text-[#6B716D]">{formatDate(order.created_at)}</td>
                        <td className="px-6 py-4 text-sm text-[#6B716D]">{order.kg_ordered}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-[#16834B]">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-[#D14343]">
                          {formatCurrency(order.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-[#6B716D] text-sm">
                        No orders found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;