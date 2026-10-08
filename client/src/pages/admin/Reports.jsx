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
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="text-sm text-muted">Generate and view business reports</p>
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
      <div className="bg-white rounded-xl border border-line p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['today', 'yesterday', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                dateRange === range
                  ? 'bg-brand text-white'
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
          <FiLoader className="w-8 h-8 animate-spin text-success" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Report Cards */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-line p-6">
              <p className="text-sm text-muted">Total Sales</p>
              <p className="text-2xl font-semibold text-ink">{formatCurrency(stats.totalSales)}</p>
            </div>
            <div className="bg-white rounded-xl border border-line p-6">
              <p className="text-sm text-muted">Total Orders</p>
              <p className="text-2xl font-semibold text-ink">{stats.totalOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-line p-6">
              <p className="text-sm text-muted">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-ink">{formatCurrency(stats.avgOrderValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-line p-6">
              <p className="text-sm text-muted">Outstanding</p>
              <p className="text-2xl font-semibold text-ink">{formatCurrency(stats.outstanding)}</p>
            </div>
          </div>

          {/* Outstanding Retailers Table */}
          <div className="bg-white rounded-xl border border-line overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-line">
              <h2 className="text-lg font-semibold text-ink">Retailers with Outstanding Balance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Shop Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {retailers.length > 0 ? (
                    retailers.map((retailer) => (
                      <tr key={retailer.id} className="hover:bg-cream transition">
                        <td className="px-6 py-4 text-sm font-medium text-ink">{retailer.shop_name}</td>
                        <td className="px-6 py-4 text-sm text-muted">{retailer.owner_name}</td>
                        <td className="px-6 py-4 text-sm text-muted">{retailer.phone}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-danger">
                          {formatCurrency(retailer.outstanding)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-muted text-sm">
                        No outstanding balances found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h2 className="text-lg font-semibold text-ink">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Kg</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.order_number} className="hover:bg-cream transition">
                        <td className="px-6 py-4 text-sm font-medium text-ink">{order.order_number}</td>
                        <td className="px-6 py-4 text-sm text-ink">{order.shop_name}</td>
                        <td className="px-6 py-4 text-sm text-muted">{formatDate(order.created_at)}</td>
                        <td className="px-6 py-4 text-sm text-muted">{order.kg_ordered}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-success">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-danger">
                          {formatCurrency(order.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-muted text-sm">
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