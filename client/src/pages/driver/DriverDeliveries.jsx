import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiTruck, 
  FiMapPin, 
  FiUser, 
  FiPhone,
  FiPackage,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiLoader
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import api from '../../services/api';

const DriverDeliveries = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState('all');

  // ============================================
  // FETCH REAL DATA FROM BACKEND
  // ============================================
  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/driver/trips');
      if (response.data.success) {
        setDeliveries(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError('Failed to load trip data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'in-progress') return d.status === 'In Progress' || d.status === 'Assigned';
    if (filter === 'completed') return d.status === 'Completed';
    return true;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusVariant = (status) => {
    if (status === 'Completed') return 'success';
    if (status === 'In Progress' || status === 'Assigned') return 'info';
    return 'default';
  };

  const getOrderStatusVariant = (status) => {
    if (status === 'Delivered') return 'success';
    return 'warning';
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading trips...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto">
        <FiAlertCircle className="w-16 h-16 text-[#D14343] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#D14343] mb-2">Unable to Load Trips</h3>
        <p className="text-sm text-[#D14343]/80 mb-4">{error}</p>
        <Button onClick={fetchTrips} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // ============================================
  // RENDER PAGE
  // ============================================
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#151A17]">My Trips</h1>
        <p className="text-sm text-[#6B716D] mt-1">View all your assigned trips</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('in-progress')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'in-progress'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'completed'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Trips List */}
      <div className="space-y-4">
        {filteredDeliveries.length > 0 ? (
          filteredDeliveries.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl border border-[#E5E8E6] p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-[#151A17]">{trip.id}</h3>
                    <Badge variant={getStatusVariant(trip.status)}>
                      {trip.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#6B716D] mt-1">{trip.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#6B716D]">Orders</p>
                  <p className="font-semibold text-[#151A17]">{trip.orders.length}</p>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-3">
                {trip.orders.map((order) => (
                  <div key={order.id} className="bg-[#F6F7F6] rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#151A17]">{order.retailer}</p>
                          <Badge variant={getOrderStatusVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-[#6B716D]">
                          <p className="flex items-center gap-1">
                            <FiMapPin className="w-3 h-3" />
                            {order.address}
                          </p>
                          <p className="flex items-center gap-1">
                            <FiPackage className="w-3 h-3" />
                            {order.kg} kg {order.actualKg && order.actualKg !== order.kg && `(Delivered: ${order.actualKg} kg)`}
                          </p>
                          <p className="flex items-center gap-1">
                            <FiDollarSign className="w-3 h-3" />
                            {formatCurrency(order.amount)}
                            {order.cashCollected > 0 && ` · Collected: ${formatCurrency(order.cashCollected)}`}
                          </p>
                        </div>
                      </div>
                      <Link to={`/driver/deliveries/${trip.id}`}>
                        <Button variant="ghost" size="sm">
                          View <FiArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-12 text-center">
            <FiTruck className="w-12 h-12 mx-auto text-[#6B716D] mb-3" />
            <p className="text-lg font-medium text-[#151A17]">No trips found</p>
            <p className="text-sm text-[#6B716D]">Try adjusting your filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDeliveries;