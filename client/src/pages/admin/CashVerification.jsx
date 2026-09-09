import { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiCheckCircle, 
  FiXCircle,
  FiClock,
  FiUser,
  FiPhone,
  FiCalendar,
  FiSearch,
  FiAlertCircle,
  FiEye,
  FiFilter,
  FiDownload,
  FiCheck,
  FiX,
  FiLoader
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

const CashVerification = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCollections, setPendingCollections] = useState([]);
  const [verifiedCollections, setVerifiedCollections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'verified'

  // ============================================
  // FETCH DATA FROM API
  // ============================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pendingRes = await api.get('/cash-verification/pending');
      const verifiedRes = await api.get('/cash-verification/verified');
      
      if (pendingRes.data.success) {
        setPendingCollections(pendingRes.data.data);
      }
      if (verifiedRes.data.success) {
        setVerifiedCollections(verifiedRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching cash verifications:', err);
      setError('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  // Filter pending collections
  const filteredPending = pendingCollections.filter(c => {
    const matchesSearch = c.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.retailer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.trip_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle verify payment
  const handleVerifyPayment = (collection) => {
    setSelectedCollection(collection);
    setIsVerificationModalOpen(true);
  };

  // Confirm verification - DEDUCTS OUTSTANDING
  const confirmVerification = async () => {
    setIsSubmitting(true);
    try {
      // driverName and tripNumber are already loaded on this page (from
      // getPendingVerifications) -- passed through so the payments row
      // created on the backend records who actually collected the cash
      // and on which trip, instead of a generic placeholder.
      const response = await api.post('/cash-verification/verify', {
        verificationId: selectedCollection.verification_id,
        orderId: selectedCollection.order_id,
        amount: selectedCollection.amount,
        driverName: selectedCollection.driver_name,
        tripNumber: selectedCollection.trip_number,
      });

      if (response.data.success) {
        setIsVerificationModalOpen(false);
        setSelectedCollection(null);
        alert(`✅ Payment of ${formatCurrency(selectedCollection.amount)} verified successfully!`);
        fetchData(); // Refresh the data
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert('Failed to verify payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reject payment
  const handleRejectPayment = async (collection) => {
    // For now, just remove from list (In real app, delete from DB or mark as rejected)
    if (window.confirm(`Are you sure you want to reject this payment?`)) {
      // Optimistic UI update
      setPendingCollections(prev => prev.filter(c => c.verification_id !== collection.verification_id));
      alert('Payment rejected.');
    }
  };

  // Calculate totals
  const totalPending = pendingCollections.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalVerified = verifiedCollections.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 animate-spin text-[#16834B]" />
        <p className="mt-4 text-[#6B716D]">Loading verification data...</p>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#D14343]" />
        <p className="mt-4 text-[#D14343] font-medium">{error}</p>
        <Button onClick={fetchData} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Cash Verification</h1>
          <p className="text-sm text-[#6B716D] mt-1">Verify cash payments collected by drivers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FDEEEE] rounded-lg">
              <FiClock className="w-5 h-5 text-[#C47A13]" />
            </div>
            <div>
              <p className="text-sm text-[#6B716D]">Pending Verification</p>
              <p className="text-2xl font-semibold text-[#151A17]">{pendingCollections.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#EAF7EF] rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-[#16834B]" />
            </div>
            <div>
              <p className="text-sm text-[#6B716D]">Verified</p>
              <p className="text-2xl font-semibold text-[#151A17]">{verifiedCollections.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F6F7F6] rounded-lg">
              <FiDollarSign className="w-5 h-5 text-[#111714]" />
            </div>
            <div>
              <p className="text-sm text-[#6B716D]">Total Pending Amount</p>
              <p className="text-2xl font-semibold text-[#D14343]">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'pending'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending Verification ({pendingCollections.length})
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'verified'
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Verified ({verifiedCollections.length})
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by order, trip, retailer, or driver..."
          className="max-w-md"
        />
      </div>

      {/* ============================================
          PENDING COLLECTIONS TABLE
      ============================================ */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
          {filteredPending.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F7F6]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E6]">
                  {filteredPending.map((collection) => (
                    <tr key={collection.verification_id} className="hover:bg-[#F6F7F6] transition">
                      <td className="px-6 py-4 text-sm font-medium text-[#151A17]">{collection.trip_number}</td>
                      <td className="px-6 py-4 text-sm text-[#6B716D]">{collection.order_number}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-[#151A17]">{collection.retailer}</p>
                          <p className="text-xs text-[#6B716D]">{collection.retailer_phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-[#151A17]">{collection.driver_name}</p>
                          <p className="text-xs text-[#6B716D]">{collection.driver_phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B716D]">
                        {formatDate(collection.submitted_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-[#16834B]">
                        {formatCurrency(collection.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="warning">Pending</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleVerifyPayment(collection)}
                            className="p-2 bg-[#16834B] text-white rounded-lg hover:bg-[#13703A] transition"
                            title="Verify Payment"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectPayment(collection)}
                            className="p-2 bg-[#D14343] text-white rounded-lg hover:bg-[#B83A3A] transition"
                            title="Reject Payment"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No pending collections"
              description="All cash collections have been verified"
              icon={FiCheckCircle}
            />
          )}
        </div>
      )}

      {/* ============================================
          VERIFIED COLLECTIONS TABLE
      ============================================ */}
      {activeTab === 'verified' && (
        <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
          {verifiedCollections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F7F6]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Verified By</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E6]">
                  {verifiedCollections.map((collection) => (
                    <tr key={collection.verification_id} className="hover:bg-[#F6F7F6] transition">
                      <td className="px-6 py-4 text-sm font-medium text-[#151A17]">{collection.trip_number}</td>
                      <td className="px-6 py-4 text-sm text-[#6B716D]">{collection.order_number}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-[#151A17]">{collection.retailer}</p>
                          <p className="text-xs text-[#6B716D]">{collection.retailer_phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#151A17]">{collection.driver_name}</td>
                      <td className="px-6 py-4 text-sm text-[#6B716D]">Admin</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-[#16834B]">
                        {formatCurrency(collection.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success">Verified</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No verified collections"
              description="No collections have been verified yet"
              icon={FiCheckCircle}
            />
          )}
        </div>
      )}

      {/* Verification Modal */}
      <Modal
        isOpen={isVerificationModalOpen}
        onClose={() => {
          setIsVerificationModalOpen(false);
          setSelectedCollection(null);
        }}
        title="Verify Cash Payment"
        description="Confirm the cash payment collected by driver"
        footer={
          <div className="flex w-full gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setIsVerificationModalOpen(false);
                setSelectedCollection(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={confirmVerification}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <FiCheckCircle className="w-4 h-4 mr-2" />
                  Verify & Deduct Balance
                </>
              )}
            </Button>
          </div>
        }
      >
        {selectedCollection && (
          <div className="space-y-4">
            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F6F7F6] rounded-lg p-3">
                <p className="text-xs text-[#6B716D]">Trip</p>
                <p className="font-medium text-[#151A17]">{selectedCollection.trip_number}</p>
              </div>
              <div className="bg-[#F6F7F6] rounded-lg p-3">
                <p className="text-xs text-[#6B716D]">Amount</p>
                <p className="font-medium text-[#16834B] text-lg">{formatCurrency(selectedCollection.amount)}</p>
              </div>
            </div>

            {/* Retailer Info */}
            <div className="bg-[#F6F7F6] rounded-lg p-3">
              <p className="text-xs text-[#6B716D]">Retailer</p>
              <p className="font-medium text-[#151A17]">{selectedCollection.retailer}</p>
              <p className="text-sm text-[#6B716D]">{selectedCollection.retailer_phone}</p>
            </div>

            {/* Driver Info */}
            <div className="bg-[#F6F7F6] rounded-lg p-3">
              <p className="text-xs text-[#6B716D]">Collected By (Driver)</p>
              <p className="font-medium text-[#151A17]">{selectedCollection.driver_name}</p>
              <p className="text-sm text-[#6B716D]">{selectedCollection.driver_phone}</p>
            </div>

            {/* Verification Notice */}
            <div className="bg-[#EAF7EF] rounded-lg p-3 border border-[#16834B]/20">
              <div className="flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 text-[#16834B]" />
                <p className="text-sm text-[#16834B]">
                  Verifying this payment will deduct ₹{selectedCollection.amount} from the retailer's outstanding balance
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashVerification;