import { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiPackage,
  FiDollarSign,
  FiTruck,
  FiClock,
  FiArrowRight,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import api from '../../services/api';
import BrandLoader from '../../components/brand/BrandLoader';

const DriverHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Fetch History from API
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/driver/history');
      if (response.data.success) {
        setHistory(response.data.data);
      } else {
        setError('Failed to load history.');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(trip =>
    trip.trip_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate total stats
  const totalTrips = history.length;
  const totalKg = history.reduce((sum, t) => sum + parseFloat(t.total_kg || 0), 0);
  const totalCollected = history.reduce((sum, t) => sum + parseFloat(t.total_cash_collected || 0), 0);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BrandLoader />
        <p className="mt-4 text-muted">Loading history...</p>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-danger" />
        <p className="mt-4 text-danger font-medium">{error}</p>
        <Button onClick={fetchHistory} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">History</h1>
        <p className="text-sm text-muted mt-1">View all your completed trips</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <FiTruck className="w-5 h-5 mx-auto text-muted mb-1" />
          <p className="text-xl font-semibold text-ink">{totalTrips}</p>
          <p className="text-xs text-muted">Total Trips</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <FiPackage className="w-5 h-5 mx-auto text-muted mb-1" />
          <p className="text-xl font-semibold text-ink">{Math.round(totalKg)} kg</p>
          <p className="text-xs text-muted">Total KG Delivered</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <FiDollarSign className="w-5 h-5 mx-auto text-muted mb-1" />
          <p className="text-xl font-semibold text-success">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-muted">Total Collected</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-line p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by trip ID..."
          className="max-w-md"
        />
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((trip) => {
            const totalCash = parseFloat(trip.total_cash_collected || 0);
            const totalAmt = parseFloat(trip.total_amount || 0);
            
            return (
              <div key={trip.trip_number} className="bg-white rounded-xl border border-line p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-ink">{trip.trip_number}</h3>
                      <Badge variant="success">Completed</Badge>
                    </div>
                    <p className="text-sm text-muted mt-1">{formatDate(trip.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{formatCurrency(totalCash)}</p>
                    <p className="text-xs text-muted">Collected</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-line">
                  <div>
                    <p className="text-xs text-muted">Orders</p>
                    <p className="font-medium text-ink">{trip.total_orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Total KG</p>
                    <p className="font-medium text-ink">{Math.round(trip.total_kg)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Total Amount</p>
                    <p className="font-medium text-ink">{formatCurrency(totalAmt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Expenses</p>
                    <p className="font-medium text-ink">{formatCurrency(trip.diesel_amount || 0)}</p>
                    <p className="text-xs text-muted">{trip.total_hens || 0} hens</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-line p-12 text-center">
            <FiClock className="w-12 h-12 mx-auto text-muted mb-3" />
            <p className="text-lg font-medium text-ink">No history found</p>
            <p className="text-sm text-muted">{searchTerm ? 'Try adjusting your search' : 'Complete your first trip to see history'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverHistory;