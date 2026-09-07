import { useState, useEffect, useMemo } from 'react';
import {
  FiTruck,
  FiCalendar,
  FiUser,
  FiPackage,
  FiLoader,
  FiAlertCircle,
  FiX,
  FiImage,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiBox,
  FiCoffee,
  FiDroplet,
  FiLayers,
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

// Uploaded bill photos are served from the backend's own root
// (server.js: app.use('/uploads', express.static(...))), not under /api.
// VITE_API_URL is the API base ("https://.../api"), so strip the /api
// suffix to get the origin the photo paths are relative to.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const CATEGORY_LABELS = {
  loading: 'Loading',
  food: 'Food',
  diesel: 'Diesel',
};

const CATEGORY_COLORS = {
  loading: 'bg-[#EAF6EF] text-[#16834B]',
  food: 'bg-[#FFF4E5] text-[#B25E00]',
  diesel: 'bg-[#EFF3FF] text-[#2952CC]',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Card styling per category chip: accent color, icon, and the tint used
// for the icon badge inside the card.
const CHIP_STYLES = {
  all: { icon: FiLayers, accent: '#151A17', tint: 'bg-[#F0F1F0]' },
  loading: { icon: FiBox, accent: '#16834B', tint: 'bg-[#EAF6EF]' },
  food: { icon: FiCoffee, accent: '#B25E00', tint: 'bg-[#FFF4E5]' },
  diesel: { icon: FiDroplet, accent: '#2952CC', tint: 'bg-[#EFF3FF]' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const monthParam = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

const Expenses = () => {
  const now = new Date();

  // Selected month for the whole page — starts on the current month.
  // month is 1-12, not the 0-11 JS Date uses.
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Which category chip is active: 'all' | 'loading' | 'food' | 'diesel'.
  const [activeCategory, setActiveCategory] = useState('all');

  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({ total: 0, loading: 0, food: 0, diesel: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Fullscreen bill photo viewer, opened from inside the trip detail modal.
  const [zoomedPhoto, setZoomedPhoto] = useState(null);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/expenses/trips', {
        params: { month: monthParam(year, month) },
      });
      if (res.data.success) {
        setTrips(res.data.data);
        setSummary(res.data.summary || { total: 0, loading: 0, food: 0, diesel: 0 });
      }
    } catch (err) {
      console.error('Error fetching trip expenses:', err);
      setError('Failed to load trip expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    setActiveCategory('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return; // don't let them browse into the future
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Trips filtered by the active category chip. "all" shows everything;
  // picking a category hides trips that have nothing in that category.
  const visibleTrips = useMemo(() => {
    if (activeCategory === 'all') return trips;
    const key = `${activeCategory}Total`; // loadingTotal / foodTotal / dieselTotal
    return trips.filter((t) => t[key] > 0);
  }, [trips, activeCategory]);

  const openTrip = async (tripId) => {
    setSelectedTripId(tripId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/expenses/trips/${tripId}`);
      if (res.data.success) {
        setDetail(res.data.data);
      } else {
        setDetailError('Could not load this trip.');
      }
    } catch (err) {
      console.error('Error fetching trip detail:', err);
      setDetailError(err.response?.data?.message || 'Could not load this trip.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeTrip = () => {
    setSelectedTripId(null);
    setDetail(null);
    setDetailError(null);
  };

  const photoSrc = (path) => (path ? `${SERVER_ORIGIN}${path}` : null);

  const categoryChips = [
    { key: 'all', label: 'All Expenses', amount: summary.total },
    { key: 'loading', label: 'Loading', amount: summary.loading },
    { key: 'food', label: 'Food', amount: summary.food },
    { key: 'diesel', label: 'Diesel', amount: summary.diesel },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Trip Expenses</h1>
          <p className="text-sm text-[#6B716D] mt-1">
            Loading, food, and diesel costs recorded against each trip.
          </p>
        </div>

        {/* Month switcher */}
        <div className="flex items-center gap-1 bg-white border border-[#E5E8E6] rounded-xl px-2 py-1.5 shadow-sm">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg hover:bg-[#F6F7F6] text-[#151A17] transition"
            title="Previous month"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[#151A17] w-36 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className={`p-1.5 rounded-lg transition ${
              isCurrentMonth
                ? 'text-[#D5D8D6] cursor-not-allowed'
                : 'hover:bg-[#F6F7F6] text-[#151A17]'
            }`}
            title="Next month"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category filter cards — click one to see that category's total
          for the selected month and narrow the list to matching trips. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {categoryChips.map((chip) => {
          const isActive = activeCategory === chip.key;
          const style = CHIP_STYLES[chip.key];
          const Icon = style.icon;

          return (
            <button
              key={chip.key}
              onClick={() => setActiveCategory(chip.key)}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                isActive
                  ? 'border-transparent shadow-md'
                  : 'border-[#E5E8E6] bg-white hover:border-[#151A17]/30 hover:shadow-sm'
              }`}
              style={
                isActive
                  ? { backgroundColor: style.accent, color: '#fff' }
                  : undefined
              }
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/15' : style.tint
                }`}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: isActive ? '#fff' : style.accent }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-medium truncate ${
                    isActive ? 'text-white/80' : 'text-[#6B716D]'
                  }`}
                >
                  {chip.label}
                </p>
                <p className="text-lg font-semibold leading-tight">
                  {formatCurrency(chip.amount)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* --- Loading state --- */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <FiLoader className="w-10 h-10 animate-spin text-[#16834B]" />
        </div>
      )}

      {/* --- Error state --- */}
      {!loading && error && (
        <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto">
          <FiAlertCircle className="w-12 h-12 text-[#D14343] mx-auto mb-3" />
          <p className="text-[#D14343] font-medium mb-4">{error}</p>
          <button
            onClick={fetchTrips}
            className="px-4 py-2 bg-[#151A17] text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {visibleTrips.length === 0 ? (
            <EmptyState
              icon={FiFileText}
              title={
                activeCategory === 'all'
                  ? `No trip expenses in ${MONTH_NAMES[month - 1]} ${year}`
                  : `No ${CATEGORY_LABELS[activeCategory].toLowerCase()} expenses in ${MONTH_NAMES[month - 1]} ${year}`
              }
              description="Expenses are recorded automatically when a driver completes a trip."
            />
          ) : (
            <div className="space-y-3">
              {visibleTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => openTrip(trip.id)}
                  className="w-full text-left bg-white rounded-xl border border-[#E5E8E6] p-5 hover:border-[#151A17] hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#F6F7F6] flex items-center justify-center">
                        <FiTruck className="w-5 h-5 text-[#151A17]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#151A17]">{trip.tripNumber}</h3>
                          <Badge variant={trip.status === 'completed' ? 'success' : 'info'}>
                            {trip.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#6B716D] mt-1">
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3.5 h-3.5" /> {formatDate(trip.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3.5 h-3.5" /> {trip.driverName}
                          </span>
                          {trip.totalHens > 0 && (
                            <span className="flex items-center gap-1">
                              <FiPackage className="w-3.5 h-3.5" /> {trip.totalHens} hens
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-[#6B716D]">
                        {trip.expenseCount} {trip.expenseCount === 1 ? 'entry' : 'entries'}
                      </p>
                      <p className="text-lg font-semibold text-[#151A17]">
                        {formatCurrency(
                          activeCategory === 'all'
                            ? trip.totalExpenses
                            : trip[`${activeCategory}Total`]
                        )}
                      </p>
                    </div>
                  </div>

                  {trip.expenseCount > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#E5E8E6]">
                      {(activeCategory === 'all' || activeCategory === 'loading') &&
                        trip.loadingTotal > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS.loading}`}>
                            Loading: {formatCurrency(trip.loadingTotal)}
                          </span>
                        )}
                      {(activeCategory === 'all' || activeCategory === 'food') &&
                        trip.foodTotal > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS.food}`}>
                            Food: {formatCurrency(trip.foodTotal)}
                          </span>
                        )}
                      {(activeCategory === 'all' || activeCategory === 'diesel') &&
                        trip.dieselTotal > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS.diesel}`}>
                            Diesel: {formatCurrency(trip.dieselTotal)}
                          </span>
                        )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Trip detail modal */}
      <Modal isOpen={!!selectedTripId} onClose={closeTrip} title="Trip Expense Detail" size="lg">
        {detailLoading && (
          <div className="flex items-center justify-center py-16">
            <FiLoader className="w-8 h-8 animate-spin text-[#16834B]" />
          </div>
        )}

        {detailError && (
          <div className="text-center py-10">
            <FiAlertCircle className="w-10 h-10 text-[#D14343] mx-auto mb-2" />
            <p className="text-[#D14343] text-sm">{detailError}</p>
          </div>
        )}

        {!detailLoading && !detailError && detail && (
          <div className="space-y-6">
            {/* Trip summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F6F7F6] rounded-xl">
              <div>
                <p className="text-xs text-[#6B716D]">Trip</p>
                <p className="font-semibold text-[#151A17]">{detail.trip.tripNumber}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B716D]">Date</p>
                <p className="font-semibold text-[#151A17]">{formatDate(detail.trip.date)}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B716D]">Driver</p>
                <p className="font-semibold text-[#151A17]">{detail.trip.driverName}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B716D]">Total Hens</p>
                <p className="font-semibold text-[#151A17]">{detail.trip.totalHens || '-'}</p>
              </div>
            </div>

            {/* Assigned staff */}
            {detail.staff.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#6B716D] mb-2">ASSIGNED STAFF</p>
                <div className="flex flex-wrap gap-2">
                  {detail.staff.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs px-3 py-1.5 bg-[#F6F7F6] rounded-full text-[#151A17]"
                    >
                      {s.name} <span className="text-[#6B716D]">({s.role})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expense list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#6B716D]">EXPENSES</p>
                <p className="text-sm font-semibold text-[#151A17]">
                  Total: {formatCurrency(detail.totalExpenses)}
                </p>
              </div>

              {detail.expenses.length === 0 ? (
                <p className="text-sm text-[#6B716D] py-6 text-center">
                  No expenses recorded for this trip.
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-start justify-between gap-4 p-4 bg-white border border-[#E5E8E6] rounded-xl"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            CATEGORY_COLORS[exp.category] || 'bg-[#F6F7F6] text-[#151A17]'
                          }`}
                        >
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-[#151A17] break-words">{exp.description}</p>
                          <p className="text-xs text-[#6B716D] mt-1">
                            {formatDate(exp.date)} · {exp.recordedBy}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {exp.photoUrl && (
                          <button
                            onClick={() => setZoomedPhoto(photoSrc(exp.photoUrl))}
                            className="relative group"
                            title="View bill photo"
                          >
                            <img
                              src={photoSrc(exp.photoUrl)}
                              alt="Bill"
                              className="w-14 h-14 object-cover rounded-lg border border-[#E5E8E6]"
                            />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition flex items-center justify-center">
                              <FiImage className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                            </span>
                          </button>
                        )}
                        <p className="font-semibold text-[#151A17] whitespace-nowrap">
                          {formatCurrency(exp.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Fullscreen photo viewer */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6"
          onClick={() => setZoomedPhoto(null)}
        >
          <button
            onClick={() => setZoomedPhoto(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white"
          >
            <FiX className="w-8 h-8" />
          </button>
          <img
            src={zoomedPhoto}
            alt="Bill full size"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Expenses;