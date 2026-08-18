import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiTruck, 
  FiPackage, 
  FiDollarSign,
  FiMapPin,
  FiPhone,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiLogOut,
  FiEdit2,
  FiUploadCloud,
  FiX
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import api from '../../services/api';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isTripStarted, setIsTripStarted] = useState(false);
  
  // Lock states for Driver inputs
  const [isHensLocked, setIsHensLocked] = useState(false);
  const [isDieselLocked, setIsDieselLocked] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [tripData, setTripData] = useState({
    totalHens: '',
    dieselAmount: '',
    dieselPhoto: null,
    dieselPhotoPreview: null,
    dieselPhotoUrl: '',
    orders: [],
  });

  // Fetch Data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/driver/dashboard');
      if (response.data.success && response.data.data.hasTrip) {
        setTrips(response.data.data.trips);
      } else {
        setTrips([]);
      }
    } catch (err) {
      console.error('Error fetching driver data:', err);
      setError('Failed to load trip data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currentTrip = trips.length > 0 ? trips[0] : null;
  const totalOrders = currentTrip?.orders?.length || 0;
  const totalKg = currentTrip?.totalKg || 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Start Trip - Set initial real data
  const handleStartTrip = () => {
    setIsTripStarted(true);
    setActiveTrip(currentTrip); // includes driverName + cleaners from the dashboard fetch
    setTripData({
      ...tripData,
      totalHens: currentTrip.totalHens || '',
      orders: currentTrip.orders.map(order => ({
        ...order,
        actualKg: order.kg,
        cashCollected: 0,
        delivered: false,
      })),
    });
  };

  // Complete Trip - Send to backend
  const handleCompleteTrip = async () => {
    try {
      const payload = {
        tripNumber: activeTrip.id,
        status: 'completed',
        totalHens: parseFloat(tripData.totalHens) || 0,
        dieselAmount: parseFloat(tripData.dieselAmount) || 0,
        dieselPhotoUrl: tripData.dieselPhotoUrl,
        orders: tripData.orders
      };

      const response = await api.put('/driver/trip/status', payload);
      if (response.data.success) {
        alert('Trip completed successfully! Cash sent to Admin for verification.');
        setIsTripStarted(false);
        setActiveTrip(null);
        setTripData({
          totalHens: '', dieselAmount: '', dieselPhoto: null, dieselPhotoPreview: null, dieselPhotoUrl: '', orders: []
        });
        setIsHensLocked(false);
        setIsDieselLocked(false);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      alert('Error completing trip. Please try again.');
    }
  };

  // Order actions
  const handleOrderDelivered = (orderId) => {
    const updatedOrders = tripData.orders.map(order =>
      order.id === orderId ? { ...order, delivered: true } : order
    );
    setTripData({ ...tripData, orders: updatedOrders });
    const allDelivered = updatedOrders.every(order => order.delivered);
    if (allDelivered) {
      alert('All orders delivered! You can now complete the trip.');
    }
  };

  const updateOrderKg = (orderId, newKg) => {
    const updatedOrders = tripData.orders.map(order =>
      order.id === orderId ? { ...order, actualKg: parseFloat(newKg) || 0 } : order
    );
    setTripData({ ...tripData, orders: updatedOrders });
  };

  const updateCashCollected = (orderId, amount) => {
    const updatedOrders = tripData.orders.map(order =>
      order.id === orderId ? { ...order, cashCollected: parseFloat(amount) || 0 } : order
    );
    setTripData({ ...tripData, orders: updatedOrders });
  };

  const getDeliveredCount = () => tripData.orders.filter(o => o.delivered).length;
  const getTotalDeliveredKg = () => tripData.orders.reduce((sum, o) => sum + (o.actualKg || 0), 0);
  const getTotalCashCollected = () => tripData.orders.reduce((sum, o) => sum + (o.cashCollected || 0), 0);

  // Loading charge: hens x rate/hen -- shown and stored in RUPEES, not kg.
  // Must match LOADING_RATE_PER_HEN in server/controllers/driverController.js.
  const LOADING_RATE_PER_HEN = 0.5;
  const loadingCharge = tripData.totalHens ? parseFloat(tripData.totalHens) * LOADING_RATE_PER_HEN : 0;

  // Food allowance preview: driver (always 1) + every cleaner assigned to
  // this trip, at a flat rate per head. Actual expense rows are written by
  // the server on trip completion -- this is just so the driver can see the
  // number before submitting.
  const FOOD_RATE_PER_HEAD = 150;
  const cleanerCount = activeTrip?.cleaners?.length || 0;
  const foodHeadCount = 1 + cleanerCount; // 1 = the driver
  const foodAllowance = foodHeadCount * FOOD_RATE_PER_HEAD;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return ( <div className="flex items-center justify-center h-64"><FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" /><p className="text-[#6B716D]">Loading trip data...</p></div> );
  }

  if (error) {
    return ( <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto"><FiAlertCircle className="w-16 h-16 text-[#D14343] mx-auto mb-4" /><h3 className="text-lg font-semibold text-[#D14343] mb-2">Unable to Load Dashboard</h3><Button onClick={fetchDashboardData} className="mt-4">Retry</Button></div> );
  }

  // ============================================
  // TRIP IN PROGRESS VIEW
  // ============================================
  if (isTripStarted && activeTrip) {
    const allDelivered = tripData.orders.every(order => order.delivered);

    return (
      <div className="max-w-4xl mx-auto pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#151A17]">Trip in Progress</h1>
            <p className="text-sm text-[#6B716D] mt-1">{activeTrip.id} - {activeTrip.date}</p>
          </div>
          <Badge variant="info">In Progress</Badge>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#6B716D]">Progress:</span>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#16834B] transition-all duration-500" style={{ width: `${totalOrders > 0 ? (getDeliveredCount() / totalOrders) * 100 : 0}%` }} />
              </div>
            </div>
            <span className="text-sm font-medium">{getDeliveredCount()}/{totalOrders}</span>
          </div>
        </div>

        {/* Assigned Staff */}
        {(activeTrip?.driverName || cleanerCount > 0) && (
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
            <h3 className="font-semibold text-[#151A17] mb-4">Assigned Staff</h3>
            <div className="flex flex-wrap gap-2">
              {activeTrip?.driverName && (
                <span className="inline-flex items-center px-3 py-1.5 bg-[#F6F7F6] rounded-full text-sm text-[#151A17]">
                  🚚 {activeTrip.driverName} <span className="text-[#6B716D] ml-1">(Driver)</span>
                </span>
              )}
              {activeTrip?.cleaners?.map((c) => (
                <span key={c.id} className="inline-flex items-center px-3 py-1.5 bg-[#F6F7F6] rounded-full text-sm text-[#151A17]">
                  🧹 {c.name} <span className="text-[#6B716D] ml-1">(Cleaner)</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-[#6B716D] mt-3">
              Food allowance on completion: {foodHeadCount} head × ₹{FOOD_RATE_PER_HEAD} ={' '}
              <span className="font-medium text-[#151A17]">₹{foodAllowance}</span>
            </p>
          </div>
        )}

        {/* Hens Loaded */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#151A17]">Total Hens Loaded</h3>
            {isHensLocked && (
              <button onClick={() => setIsHensLocked(false)} className="flex items-center gap-1.5 text-sm text-[#16834B] hover:underline">
                <FiEdit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={tripData.totalHens}
              onChange={(e) => setTripData({ ...tripData, totalHens: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && tripData.totalHens) setIsHensLocked(true); }}
              placeholder="e.g. 1000"
              className={`flex-1 px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-[#111714] outline-none transition ${isHensLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-[#E5E8E6]'}`}
              disabled={isHensLocked}
              min="0"
              step="1"
            />
            <span className="text-sm font-medium text-[#6B716D] whitespace-nowrap">hens</span>
            {!isHensLocked && (
              <Button
                onClick={() => tripData.totalHens && setIsHensLocked(true)}
                disabled={!tripData.totalHens || parseFloat(tripData.totalHens) <= 0}
                className="px-4 py-3"
              >
                Confirm
              </Button>
            )}
          </div>

          {/* Loading charge readout -- in rupees, matching what the server stores
              as the "loading" expense against this trip. */}
          {tripData.totalHens && parseFloat(tripData.totalHens) > 0 && (
            <div className="mt-4 p-3 bg-[#F6F7F6] rounded-lg flex items-center justify-between">
              <span className="text-sm text-[#6B716D]">
                {tripData.totalHens} hens × ₹{LOADING_RATE_PER_HEN}
              </span>
              <span className="font-semibold text-[#151A17]">
                {formatCurrency(loadingCharge)}
              </span>
            </div>
          )}
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-6">
          <h3 className="font-semibold text-[#151A17] mb-4 flex justify-between items-center">
            Expenses
            {isDieselLocked && (
              <button onClick={() => setIsDieselLocked(false)} className="flex items-center gap-2 text-sm text-[#16834B] hover:underline">
                <FiEdit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </h3>

          <div className="space-y-4">
            {/* Diesel Input */}
            <div className="max-w-xs">
              <label className="block text-sm text-[#6B716D] mb-1.5">Diesel Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tripData.dieselAmount}
                  onChange={(e) => setTripData({ ...tripData, dieselAmount: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && tripData.dieselAmount) setIsDieselLocked(true); }}
                  placeholder="e.g. 500"
                  className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] outline-none transition ${isDieselLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-[#E5E8E6]'}`}
                  disabled={isDieselLocked}
                  min="0"
                  step="1"
                />
                {!isDieselLocked && (
                  <Button
                    onClick={() => tripData.dieselAmount && setIsDieselLocked(true)}
                    disabled={!tripData.dieselAmount || parseFloat(tripData.dieselAmount) <= 0}
                    className="px-4 py-2.5"
                  >
                    Confirm
                  </Button>
                )}
              </div>
            </div>

            {/* Diesel Bill Image Upload */}
            <div>
              <label className="block text-sm text-[#6B716D] mb-1.5">Upload Bill Image</label>
              <div className="border-2 border-dashed border-[#E5E8E6] rounded-lg p-6 text-center hover:border-[#111714] transition">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="diesel-photo"
                  disabled={isUploadingPhoto}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    setUploadError(null);
                    setTripData((prev) => ({
                      ...prev,
                      dieselPhoto: file,
                      dieselPhotoPreview: URL.createObjectURL(file),
                    }));

                    setIsUploadingPhoto(true);
                    try {
                      const formData = new FormData();
                      formData.append('photo', file);
                      const res = await api.post('/driver/upload-photo', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      if (res.data.success) {
                        setTripData((prev) => ({ ...prev, dieselPhotoUrl: res.data.url }));
                      } else {
                        setUploadError('Upload failed. Please try again.');
                      }
                    } catch (err) {
                      console.error('Error uploading diesel photo:', err);
                      setUploadError(
                        err.response?.data?.message || 'Upload failed. Please try again.'
                      );
                    } finally {
                      setIsUploadingPhoto(false);
                    }
                  }}
                />
                <label htmlFor="diesel-photo" className="cursor-pointer">
                  {tripData.dieselPhotoPreview ? (
                    <div className="relative inline-block">
                      <img src={tripData.dieselPhotoPreview} alt="Bill" className="w-32 h-32 object-cover mx-auto rounded-lg border border-[#E5E8E6]" />
                      <button onClick={(e) => { e.preventDefault(); setTripData({ ...tripData, dieselPhoto: null, dieselPhotoPreview: null, dieselPhotoUrl: '' }); setUploadError(null); }} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FiUploadCloud className="w-12 h-12 text-[#6B716D] mb-2" />
                      <p className="text-sm text-[#6B716D]">Click to upload diesel bill photo</p>
                    </div>
                  )}
                </label>
              </div>
              {isUploadingPhoto && (
                <p className="text-xs text-[#6B716D] mt-2">Uploading...</p>
              )}
              {!isUploadingPhoto && tripData.dieselPhotoPreview && tripData.dieselPhotoUrl && (
                <p className="text-xs text-[#16834B] mt-2">Uploaded</p>
              )}
              {uploadError && (
                <p className="text-xs text-[#D14343] mt-2">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Orders to Deliver */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-[#151A17]">Orders to Deliver</h3>
          {tripData.orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-[#E5E8E6] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-[#151A17]">{order.id}</h4>
                    <Badge variant={order.delivered ? 'success' : 'warning'}>{order.delivered ? 'Delivered' : 'Pending'}</Badge>
                  </div>
                  <p className="text-sm font-medium text-[#151A17] mt-1">{order.retailer}</p>
                </div>
                <span className="text-sm font-medium text-[#151A17]">{formatCurrency(order.amount)}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-[#6B716D]"><FiMapPin className="w-4 h-4" />{order.address}</div>
                <div className="flex items-center gap-2 text-sm text-[#6B716D]"><FiPhone className="w-4 h-4" />{order.phone}</div>
              </div>

              {!order.delivered ? (
                <div className="space-y-3 pt-3 border-t border-[#E5E8E6]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#6B716D] mb-1">Ordered KG</label>
                      <input type="number" value={order.kg} disabled className="w-full px-3 py-2 border border-[#E5E8E6] rounded-lg bg-gray-50 text-[#6B716D]" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B716D] mb-1">Actual Delivered (KG)</label>
                      <input type="number" value={order.actualKg || ''} onChange={(e) => updateOrderKg(order.id, e.target.value)} placeholder="Enter actual kg" className="w-full px-3 py-2 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] outline-none transition" min="0" step="0.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B716D] mb-1">Cash Collected (₹)</label>
                    <input type="number" value={order.cashCollected || ''} onChange={(e) => updateCashCollected(order.id, e.target.value)} placeholder="Enter cash collected" className="w-full px-3 py-2 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] outline-none transition" min="0" step="1" />
                  </div>
                  <Button size="sm" className="w-full mt-2" onClick={() => handleOrderDelivered(order.id)}><FiCheckCircle className="w-4 h-4 mr-2" />Mark as Delivered</Button>
                </div>
              ) : (
                <div className="pt-3 border-t border-[#E5E8E6]">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-[#6B716D]">Delivered KG</p><p className="font-medium text-[#151A17]">{order.actualKg || order.kg} kg</p></div>
                    <div><p className="text-[#6B716D]">Cash Collected</p><p className="font-medium text-[#16834B]">{formatCurrency(order.cashCollected || 0)}</p></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary & Complete Trip */}
        {getDeliveredCount() > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 sticky bottom-0 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center"><p className="text-xs text-[#6B716D]">Orders</p><p className="text-lg font-semibold">{getDeliveredCount()}/{totalOrders}</p></div>
              <div className="text-center"><p className="text-xs text-[#6B716D]">Total KG</p><p className="text-lg font-semibold">{getTotalDeliveredKg().toFixed(1)} kg</p></div>
              <div className="text-center"><p className="text-xs text-[#6B716D]">Cash Collected</p><p className="text-lg font-semibold text-[#16834B]">{formatCurrency(getTotalCashCollected())}</p></div>
              <div className="text-center"><p className="text-xs text-[#6B716D]">Total Hens</p><p className="text-lg font-semibold">{tripData.totalHens || 0}</p></div>
            </div>
            <Button className="w-full py-3 text-base" onClick={handleCompleteTrip} disabled={!allDelivered}>
              {allDelivered ? <><FiCheckCircle className="w-5 h-5 mr-2" />Complete Trip</> : <><FiAlertCircle className="w-5 h-5 mr-2" />Deliver all orders to complete</>}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // DASHBOARD VIEW (No trip started)
  // ============================================
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">{getGreeting()}, {user?.name || 'Driver'} 👋</h1>
          <p className="text-sm text-[#6B716D] mt-1">{trips.length > 0 ? 'Your assigned trips for today' : 'No trips assigned for today'}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 px-4 py-2 text-sm text-[#6B716D] hover:text-[#D14343] transition"><FiLogOut className="w-4 h-4" />Logout</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center"><FiTruck className="w-5 h-5 mx-auto text-[#6B716D] mb-1" /><p className="text-xl font-semibold">{trips.length}</p><p className="text-xs text-[#6B716D]">Trips Today</p></div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center"><FiPackage className="w-5 h-5 mx-auto text-[#6B716D] mb-1" /><p className="text-xl font-semibold">{totalOrders}</p><p className="text-xs text-[#6B716D]">Total Orders</p></div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 text-center"><FiDollarSign className="w-5 h-5 mx-auto text-[#6B716D] mb-1" /><p className="text-xl font-semibold">{totalKg} kg</p><p className="text-xs text-[#6B716D]">Total Weight</p></div>
      </div>

      {trips.length > 0 ? (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl border border-[#E5E8E6] p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div><div className="flex items-center gap-3"><h3 className="font-semibold">{trip.id}</h3><Badge variant="info">Assigned</Badge></div><p className="text-sm text-[#6B716D] mt-1">{trip.date}</p></div>
                <div className="text-right"><p className="text-sm text-[#6B716D]">Orders</p><p className="font-semibold">{trip.totalOrders}</p></div>
              </div>
              <div className="space-y-2 mb-4">
                {trip.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-sm bg-[#F6F7F6] p-3 rounded-lg">
                    <div><p className="font-medium">{order.retailer}</p><p className="text-xs text-[#6B716D]">{order.id} • {order.kg} kg</p></div>
                    <span className="text-sm font-medium">{formatCurrency(order.amount)}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleStartTrip}><FiTruck className="w-4 h-4 mr-2" />Start Trip</Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-12 text-center">
          <FiCheckCircle className="w-12 h-12 mx-auto text-[#16834B] mb-3" />
          <p className="text-lg font-medium">No trips assigned</p>
          <p className="text-sm text-[#6B716D]">You have no trips scheduled for today</p>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;