import { useState, useEffect } from 'react';
import {
  FiTruck,
  FiCalendar,
  FiUser,
  FiPackage,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiFileText,
  FiBriefcase,
  FiX,
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

const formatNumber = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// A diff of 0 is a clean match. Anything else is a shortfall/overage worth
// flagging — shown in red regardless of direction, since either one means
// the loaded and delivered numbers don't line up.
const DiffBadge = ({ diff, unit }) => {
  const isMatch = Math.abs(diff) < 0.01;
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${
        isMatch ? 'bg-[#EAF6EF] text-[#16834B]' : 'bg-[#FDEEEE] text-[#D14343]'
      }`}
    >
      {isMatch ? 'Matched' : `${diff > 0 ? '-' : '+'}${formatNumber(Math.abs(diff))} ${unit}`}
    </span>
  );
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const TripOverview = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options fetched once
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Active filter values
  const [dateFilter, setDateFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mismatchOnly, setMismatchOnly] = useState(false);

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchFilters = async () => {
    try {
      const res = await api.get('/trip-overview/filters');
      if (res.data.success) {
        setCompanies(res.data.data.companies);
        setDrivers(res.data.data.drivers);
      }
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (companyFilter) params.companyId = companyFilter;
      if (driverFilter) params.driverId = driverFilter;
      if (statusFilter) params.status = statusFilter;
      if (mismatchOnly) params.mismatchOnly = 'true';

      const res = await api.get('/trip-overview/trips', { params });
      if (res.data.success) {
        setTrips(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching trip overview:', err);
      setError('Failed to load trip overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, companyFilter, driverFilter, statusFilter, mismatchOnly]);

  const openTrip = async (tripId) => {
    setSelectedTripId(tripId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/trip-overview/trips/${tripId}`);
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

  const clearFilters = () => {
    setDateFilter('');
    setCompanyFilter('');
    setDriverFilter('');
    setStatusFilter('');
    setMismatchOnly(false);
  };

  const hasActiveFilters = dateFilter || companyFilter || driverFilter || statusFilter || mismatchOnly;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#151A17]">Trip Overview</h1>
        <p className="text-sm text-[#6B716D] mt-1">
          What was loaded from each company vs what was actually delivered across every retailer stop.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Date</label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B716D] pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[140px]"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Driver</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[140px]"
            >
              <option value="">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B716D] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm focus:ring-2 focus:ring-[#111714] outline-none transition min-w-[130px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mismatchOnly}
              onChange={(e) => setMismatchOnly(e.target.checked)}
              className="accent-[#D14343]"
            />
            <span className="text-[#151A17]">Mismatches only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B716D] hover:text-[#D14343] transition"
            >
              <FiX className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <FiLoader className="w-10 h-10 animate-spin text-[#16834B]" />
        </div>
      )}

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
          {trips.length === 0 ? (
            <EmptyState
              icon={FiFileText}
              title={hasActiveFilters ? 'No trips match these filters' : 'No trips yet'}
              description={
                hasActiveFilters
                  ? 'Try a different date, company, driver, or status.'
                  : 'Trips will show up here once a driver completes one.'
              }
            />
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => openTrip(trip.id)}
                  className="w-full text-left bg-white rounded-xl border border-[#E5E8E6] p-5 hover:border-[#151A17] hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
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
                          <span className="flex items-center gap-1">
                            <FiBriefcase className="w-3.5 h-3.5" /> {trip.companyName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B716D]">
                      {trip.retailerCount} {trip.retailerCount === 1 ? 'retailer' : 'retailers'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#E5E8E6]">
                    <div>
                      <p className="text-xs text-[#6B716D]">Loaded</p>
                      <p className="text-sm font-semibold text-[#151A17]">
                        {formatNumber(trip.loadedHens)} hens · {formatNumber(trip.loadedKg)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B716D]">Delivered</p>
                      <p className="text-sm font-semibold text-[#151A17]">
                        {formatNumber(trip.deliveredHens)} hens · {formatNumber(trip.deliveredKg)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B716D] mb-1">Hens</p>
                      <DiffBadge diff={trip.hensDiff} unit="hens" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6B716D] mb-1">Weight</p>
                      <DiffBadge diff={trip.kgDiff} unit="kg" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Trip detail modal */}
      <Modal isOpen={!!selectedTripId} onClose={closeTrip} title="Trip Reconciliation" size="lg">
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
            {/* Trip + company summary */}
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
                <p className="text-xs text-[#6B716D]">Company</p>
                <p className="font-semibold text-[#151A17]">{detail.trip.companyName}</p>
              </div>
            </div>

            {/* Loaded totals */}
            <div>
              <p className="text-xs font-medium text-[#6B716D] mb-2">LOADED FROM COMPANY</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#E5E8E6] rounded-xl">
                  <p className="text-xs text-[#6B716D]">Hens Loaded</p>
                  <p className="text-xl font-bold text-[#151A17]">{formatNumber(detail.trip.loadedHens)}</p>
                </div>
                <div className="p-4 bg-white border border-[#E5E8E6] rounded-xl">
                  <p className="text-xs text-[#6B716D]">Weight Loaded</p>
                  <p className="text-xl font-bold text-[#151A17]">{formatNumber(detail.trip.loadedKg)} kg</p>
                </div>
              </div>
            </div>

            {/* Retailer deliveries */}
            <div>
              <p className="text-xs font-medium text-[#6B716D] mb-2">DELIVERED TO RETAILERS</p>

              {detail.deliveries.length === 0 ? (
                <p className="text-sm text-[#6B716D] py-6 text-center">
                  No retailer deliveries recorded for this trip.
                </p>
              ) : (
                <div className="space-y-2">
                  {detail.deliveries.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 p-4 bg-white border border-[#E5E8E6] rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#F6F7F6] flex items-center justify-center shrink-0">
                          <FiPackage className="w-4 h-4 text-[#151A17]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#151A17] truncate">{d.retailer}</p>
                          <p className="text-xs text-[#6B716D]">{d.orderNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0 text-right">
                        <div>
                          <p className="text-xs text-[#6B716D]">Hens</p>
                          <p className="text-sm font-semibold text-[#151A17]">{formatNumber(d.hensDelivered)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#6B716D]">KG</p>
                          <p className="text-sm font-semibold text-[#151A17]">{formatNumber(d.kgDelivered)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reconciliation */}
            <div>
              <p className="text-xs font-medium text-[#6B716D] mb-2">RECONCILIATION</p>
              <div className="p-4 bg-[#F6F7F6] rounded-xl space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-[#6B716D] pb-2 border-b border-[#E5E8E6]">
                  <span></span>
                  <span className="text-right">Hens</span>
                  <span className="text-right">KG</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <span className="text-[#6B716D]">Loaded</span>
                  <span className="text-right font-medium text-[#151A17]">{formatNumber(detail.totals.loadedHens)}</span>
                  <span className="text-right font-medium text-[#151A17]">{formatNumber(detail.totals.loadedKg)}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <span className="text-[#6B716D]">Delivered</span>
                  <span className="text-right font-medium text-[#151A17]">{formatNumber(detail.totals.deliveredHens)}</span>
                  <span className="text-right font-medium text-[#151A17]">{formatNumber(detail.totals.deliveredKg)}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t border-[#E5E8E6]">
                  <span className="font-semibold text-[#151A17]">Difference</span>
                  <span className="text-right">
                    <DiffBadge diff={detail.totals.hensDiff} unit="hens" />
                  </span>
                  <span className="text-right">
                    <DiffBadge diff={detail.totals.kgDiff} unit="kg" />
                  </span>
                </div>
              </div>
              {Math.abs(detail.totals.hensDiff) < 0.01 && Math.abs(detail.totals.kgDiff) < 0.01 ? (
                <p className="text-xs text-[#16834B] mt-2 flex items-center gap-1">
                  <FiCheckCircle className="w-3.5 h-3.5" /> Loaded and delivered totals match.
                </p>
              ) : (
                <p className="text-xs text-[#D14343] mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3.5 h-3.5" /> Loaded and delivered totals don't match — worth checking.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TripOverview;