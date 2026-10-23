import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiTruck, 
  FiUser, 
  FiPhone, 
  FiMapPin,
  FiPlus,
  FiX,
  FiCheck,
  FiUsers,
  FiPackage,
  FiChevronDown,
  FiChevronUp,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import { useAuth } from '../../context/AuthContext';
import BrandLoader from '../../components/brand/BrandLoader';

const Deliveries = () => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [inProgressOrders, setInProgressOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState([]);
  const [isCleanerDropdownOpen, setIsCleanerDropdownOpen] = useState(false);
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch pending orders
      const pendingRes = await axios.get(`${API_URL}/deliveries/pending`, { headers });
      if (pendingRes.data.success) {
        setPendingOrders(pendingRes.data.data);
        console.log('✅ Pending orders:', pendingRes.data.data.length);
      }

      // Fetch in-progress orders
      const inProgressRes = await axios.get(`${API_URL}/deliveries/in-progress`, { headers });
      if (inProgressRes.data.success) {
        setInProgressOrders(inProgressRes.data.data);
        console.log('✅ In-progress orders:', inProgressRes.data.data.length);
      }

      // Fetch drivers
      const driversRes = await axios.get(`${API_URL}/deliveries/drivers`, { headers });
      if (driversRes.data.success) {
        setDrivers(driversRes.data.data);
        console.log('✅ Drivers:', driversRes.data.data.length);
      }

      // Fetch cleaners
      const cleanersRes = await axios.get(`${API_URL}/deliveries/cleaners`, { headers });
      if (cleanersRes.data.success) {
        setCleaners(cleanersRes.data.data);
        console.log('✅ Cleaners:', cleanersRes.data.data.length);
      }

      // Fetch vehicles
      const vehiclesRes = await axios.get(`${API_URL}/deliveries/vehicles`, { headers });
      if (vehiclesRes.data.success) {
        setVehicles(vehiclesRes.data.data);
        console.log('✅ Vehicles:', vehiclesRes.data.data.length);
      }

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to fetch data');
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred while fetching data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Toggle order selection for trip
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Toggle cleaner selection
  const toggleCleaner = (cleanerId) => {
    setSelectedCleaners(prev =>
      prev.includes(cleanerId)
        ? prev.filter(id => id !== cleanerId)
        : [...prev, cleanerId]
    );
  };

  const resetAssignment = () => {
    setSelectedOrders([]);
    setSelectedDriver('');
    setSelectedVehicle('');
    setSelectedCleaners([]);
    setIsCleanerDropdownOpen(false);
    setIsDriverDropdownOpen(false);
    setIsVehicleDropdownOpen(false);
  };

  const handleAssignDelivery = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order');
      return;
    }

    if (!selectedDriver) {
      alert('Please select a driver');
      return;
    }

    if (!selectedVehicle) {
      alert('Please select a vehicle');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        orderIds: selectedOrders,
        driverId: parseInt(selectedDriver),
        vehicleId: parseInt(selectedVehicle),
        cleanerIds: selectedCleaners.map(id => parseInt(id))
      };

      console.log('📦 Assigning trip:', payload);

      const response = await axios.post(
        `${API_URL}/deliveries/assign-trip`,
        payload,
        { headers }
      );

      if (response.data.success) {
        alert(`Trip assigned successfully with ${selectedOrders.length} order(s)!`);
        setIsAssignModalOpen(false);
        resetAssignment();
        fetchAllData(); // Refresh data
      } else {
        alert(response.data.message || 'Failed to assign trip');
      }
    } catch (error) {
      console.error('Error assigning trip:', error);
      alert(error.response?.data?.message || 'Failed to assign trip. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get selected orders summary
  const getSelectedOrdersSummary = () => {
    const selected = pendingOrders.filter(d => selectedOrders.includes(d.id));
    const totalKg = selected.reduce((sum, d) => sum + (d.kg_ordered || 0), 0);
    const totalAmount = selected.reduce((sum, d) => sum + (d.total_amount || 0), 0);
    return { totalKg, totalAmount, count: selected.length };
  };

  const summary = getSelectedOrdersSummary();

  // Filter pending orders
  const filteredUnassigned = pendingOrders.filter(d =>
    d.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BrandLoader />
        <p className="mt-4 text-muted">Loading deliveries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-danger" />
        <p className="mt-4 text-danger font-medium">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={fetchAllData}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Deliveries</h1>
          <p className="text-sm text-muted mt-1">Assign drivers and vehicles to pending orders</p>
        </div>
        <Button onClick={() => setIsAssignModalOpen(true)}>
          <FiPlus className="w-4 h-4 mr-2" />
          Assign Delivery
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-line p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer or order ID..."
          className="max-w-md"
        />
      </div>

      {/* Unassigned Deliveries */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-ink">Unassigned</h2>
          <Badge variant="warning">{filteredUnassigned.length}</Badge>
        </div>

        {filteredUnassigned.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUnassigned.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-line p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-ink">{order.shop_name}</h3>
                    <p className="text-sm text-muted">{order.order_number} • {order.kg_ordered} kg • {formatCurrency(order.total_amount)}</p>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
                {order.delivery_address && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <FiMapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{order.delivery_address}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-line p-8 text-center">
            <FiCheck className="w-12 h-12 mx-auto text-success mb-3" />
            <p className="text-muted">All deliveries have been assigned</p>
          </div>
        )}
      </div>

      {/* In Progress Deliveries */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-ink">In Progress</h2>
          <Badge variant="info">{inProgressOrders.length}</Badge>
        </div>

        {inProgressOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-line p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-ink">{order.shop_name}</h3>
                    <p className="text-sm text-muted">{order.order_number} • {order.kg_ordered} kg</p>
                  </div>
                  <Badge variant="info">Out for Delivery</Badge>
                </div>
                {order.delivery_address && (
                  <div className="flex items-start gap-2 text-sm text-muted">
                    <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{order.delivery_address}</span>
                  </div>
                )}
                <div className="mt-3 space-y-1 text-sm">
                  {order.driver_name && (
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-muted" />
                      <span className="font-medium">Driver:</span>
                      <span>{order.driver_name}</span>
                    </div>
                  )}
                  {order.vehicle_reg && (
                    <div className="flex items-center gap-2">
                      <FiTruck className="w-4 h-4 text-muted" />
                      <span className="font-medium">Vehicle:</span>
                      <span>{order.vehicle_reg}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-line p-8 text-center">
            <FiCheck className="w-12 h-12 mx-auto text-success mb-3" />
            <p className="text-muted">No deliveries in progress</p>
          </div>
        )}
      </div>

      {/* Assign Delivery Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          resetAssignment();
        }}
        title="Assign Order to Driver"
        description="Select orders, driver, vehicle, and cleaners for this trip"
        size="lg"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAssignModalOpen(false);
                resetAssignment();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignDelivery} disabled={submitting}>
              {submitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <FiTruck className="w-4 h-4 mr-2" />
                  Assign & Notify
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Orders Selection */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Select Orders for Trip <span className="text-danger">*</span>
              <span className="text-xs text-muted ml-2">
                ({selectedOrders.length} selected)
              </span>
            </label>
            <div className="border border-line rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">No pending orders available</p>
              ) : (
                pendingOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => toggleOrderSelection(order.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition ${
                      selectedOrders.includes(order.id)
                        ? 'bg-brand text-white'
                        : 'bg-cream text-ink hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{order.order_number}</span>
                      <span>{order.shop_name}</span>
                      <span className="text-xs opacity-70">{order.kg_ordered} kg</span>
                    </div>
                    {selectedOrders.includes(order.id) && (
                      <FiCheck className="w-4 h-4" />
                    )}
                  </button>
                ))
              )}
            </div>
            {selectedOrders.length > 0 && (
              <div className="mt-2 text-sm text-muted">
                Selected: {summary.count} order(s) • {summary.totalKg} kg • {formatCurrency(summary.totalAmount)}
              </div>
            )}
          </div>

          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Driver <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <button
                onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-line rounded-lg bg-white hover:bg-gray-50 transition"
              >
                <span className={selectedDriver ? 'text-ink' : 'text-muted'}>
                  {selectedDriver ? drivers.find(d => d.id === parseInt(selectedDriver))?.name || 'Select a driver...' : 'Select a driver...'}
                </span>
                {isDriverDropdownOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              </button>
              {isDriverDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {drivers.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => {
                        setSelectedDriver(driver.id);
                        setIsDriverDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-cream transition ${
                        selectedDriver === driver.id ? 'bg-cream' : ''
                      }`}
                    >
                      <span className="text-sm">{driver.name}</span>
                      <span className="text-xs text-muted ml-2">{driver.vehicle_number || 'No vehicle'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Vehicle <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <button
                onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-line rounded-lg bg-white hover:bg-gray-50 transition"
              >
                <span className={selectedVehicle ? 'text-ink' : 'text-muted'}>
                  {selectedVehicle ? vehicles.find(v => v.id === parseInt(selectedVehicle))?.number || 'Select a vehicle...' : 'Select a vehicle...'}
                </span>
                {isVehicleDropdownOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              </button>
              {isVehicleDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicle(vehicle.id);
                        setIsVehicleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-cream transition ${
                        selectedVehicle === vehicle.id ? 'bg-cream' : ''
                      }`}
                    >
                      <div>
                        <span className="text-sm">{vehicle.number}</span>
                        <span className="text-xs text-muted ml-2">({vehicle.type})</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cleaners Selection */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Cleaners <span className="text-xs text-muted font-normal">(Optional - Select multiple)</span>
            </label>
            <div className="relative">
              <button
                onClick={() => setIsCleanerDropdownOpen(!isCleanerDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-line rounded-lg bg-white hover:bg-gray-50 transition"
              >
                <span className={selectedCleaners.length > 0 ? 'text-ink' : 'text-muted'}>
                  {selectedCleaners.length > 0 
                    ? `${selectedCleaners.length} cleaner${selectedCleaners.length > 1 ? 's' : ''} selected`
                    : 'Select cleaners...'}
                </span>
                {isCleanerDropdownOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              </button>
              {isCleanerDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {cleaners.map((cleaner) => (
                    <button
                      key={cleaner.id}
                      onClick={() => toggleCleaner(cleaner.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-cream transition ${
                        selectedCleaners.includes(cleaner.id) ? 'bg-cream' : ''
                      }`}
                    >
                      <span className="text-sm">{cleaner.name}</span>
                      {selectedCleaners.includes(cleaner.id) && (
                        <FiCheck className="w-4 h-4 text-success" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Deliveries;