import { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiCalendar,
  FiArrowRight,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
import BrandLoader from '../../components/brand/BrandLoader';

const DriverCollections = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);

  // ============================================
  // FETCH REAL DATA
  // ============================================
  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/driver/collections');
        if (response.data.success) {
          setCollections(response.data.data);
        } else {
          setError('Failed to load collection data.');
        }
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError('Could not connect to server.');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // ============================================
  // CALCULATE STATS
  // ============================================
  const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
  const pendingVerification = collections.filter(c => c.status === 'Pending Verification').length;
  const verified = collections.filter(c => c.status === 'Verified').length;

  // ============================================
  // FORMAT HELPERS
  // ============================================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ============================================
  // LOADING & ERROR STATES
  // ============================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BrandLoader />
        <p className="mt-4 text-muted">Loading your collections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-danger" />
        <p className="mt-4 text-danger font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Collections</h1>
        <p className="text-sm text-muted mt-1">Track all your cash collections</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Total Collected</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Pending Verification</p>
          <p className="text-2xl font-bold text-[#C47A13]">{pendingVerification}</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Verified</p>
          <p className="text-2xl font-bold text-success">{verified}</p>
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Collection History</h2>
        </div>

        {collections.length === 0 ? (
          <div className="p-10 text-center text-muted">
            <FiDollarSign className="w-12 h-12 mx-auto mb-3 text-line" />
            <p>No cash collections found.</p>
            <p className="text-sm">Complete a trip to submit cash for verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Collection ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Trip</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {collections.map((collection) => (
                  <tr key={collection.id} className="hover:bg-cream transition">
                    <td className="px-6 py-4 text-sm font-medium text-ink">{collection.id}</td>
                    <td className="px-6 py-4 text-sm text-muted">{collection.orderId}</td>
                    <td className="px-6 py-4 text-sm text-ink">{collection.retailer}</td>
                    <td className="px-6 py-4 text-sm text-muted">{collection.method}</td>
                    <td className="px-6 py-4 text-sm text-muted">{collection.date}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-success">
                      {formatCurrency(collection.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={collection.status === 'Verified' ? 'success' : 'warning'}>
                        {collection.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverCollections;