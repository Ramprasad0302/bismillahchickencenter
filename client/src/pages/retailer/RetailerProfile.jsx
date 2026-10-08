import { useState, useEffect } from 'react';
import { 
  FiPhone, 
  FiMail, 
  FiMapPin,
  FiCalendar,
  FiCheckCircle,
  FiUser,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import api from '../../services/api';

const RetailerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real Live Data States
  const [profile, setProfile] = useState({
    ownerName: '',
    shopName: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    city: '',
    pincode: '',
    outstanding: 0,
    status: 'Active',
    joined: '',
  });

  // ============================================
  // FETCH LIVE DATA FROM BACKEND
  // ============================================
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Personal Info
        const retailerRes = await api.get('/retailers/me');
        
        if (retailerRes.data.success) {
          const data = retailerRes.data.data;
          setProfile(prev => ({
            ...prev,
            ownerName: data.owner_name || 'Not Provided',
            shopName: data.shop_name || 'Not Provided',
            phone: data.phone || 'Not Provided',
            email: data.email || 'Not Provided',
            address: data.address || 'Not Provided',
            area: data.area || 'Not Provided',
            city: data.city || 'Not Provided',
            pincode: data.pincode || 'Not Provided',
            joined: data.joined_date ? new Date(data.joined_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'N/A',
            status: data.status || 'Active'
          }));
        }

        // 2. Fetch Outstanding Balance
        const statsRes = await api.get('/retailers/stats');
        if (statsRes.data.success) {
          setProfile(prev => ({
            ...prev,
            outstanding: statsRes.data.data.outstandingBalance || 0
          }));
        }

      } catch (err) {
        console.error('❌ Error fetching profile data:', err);
        setError('Failed to load profile data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // ============================================
  // HELPER FUNCTIONS
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
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto mt-8">
        <FiAlertCircle className="w-16 h-16 text-[#D14343] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#D14343] mb-2">Unable to Load Profile</h3>
        <p className="text-sm text-[#D14343]/80 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-[#D14343] text-white rounded-lg hover:bg-[#b03939] transition"
        >
          Retry
        </button>
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
        <h1 className="text-2xl font-semibold text-[#151A17]">Profile</h1>
        <p className="text-sm text-[#6B716D] mt-1">View your profile information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        {/* Header with status */}
        <div className="px-6 py-4 border-b border-[#E5E8E6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-[#111714] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {profile.ownerName ? profile.ownerName[0].toUpperCase() : '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#151A17]">{profile.ownerName}</h2>
              <p className="text-sm text-[#6B716D]">{profile.shopName}</p>
            </div>
          </div>
          <Badge variant={profile.status?.toLowerCase() === 'active' ? 'success' : 'default'}>
            {profile.status}
          </Badge>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-[#6B716D] uppercase tracking-wider mb-4">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiPhone className="w-4 h-4 text-[#6B716D]" />
                  <span className="text-sm text-[#151A17]">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiMail className="w-4 h-4 text-[#6B716D]" />
                  <span className="text-sm text-[#151A17]">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiMapPin className="w-4 h-4 text-[#6B716D]" />
                  <span className="text-sm text-[#151A17]">{profile.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-4 h-4 text-[#6B716D]" />
                  <span className="text-sm text-[#151A17]">Joined: {profile.joined}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#6B716D] uppercase tracking-wider mb-4">
                Account Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#FDEEEE] rounded-lg border border-[#D14343]/20">
                  <span className="text-sm font-medium text-[#D14343]">Outstanding</span>
                  <span className="text-sm font-bold text-[#D14343]">
                    {formatCurrency(profile.outstanding)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B716D]">Status</span>
                  <Badge variant={profile.status?.toLowerCase() === 'active' ? 'success' : 'default'}>
                    {profile.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F6F7F6] rounded-lg">
                  <span className="text-sm text-[#6B716D]">Shop Area</span>
                  <span className="text-sm font-medium text-[#151A17]">
                    {profile.area}, {profile.city}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F6F7F6] rounded-lg">
                  <span className="text-sm text-[#6B716D]">Pincode</span>
                  <span className="text-sm font-medium text-[#151A17]">{profile.pincode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 pt-6 border-t border-[#E5E8E6]">
            <p className="text-xs text-[#6B716D] text-center">
              <FiUser className="inline w-3 h-3 mr-1" />
              Contact your administrator to update your profile information
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerProfile;