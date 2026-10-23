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
import BrandLoader from '../../components/brand/BrandLoader';

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
          <BrandLoader />
          <p className="text-muted">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="bg-danger-soft border border-danger/20 rounded-xl p-8 text-center max-w-md mx-auto mt-8">
        <FiAlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-danger mb-2">Unable to Load Profile</h3>
        <p className="text-sm text-danger/80 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger-dark transition"
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
        <h1 className="text-2xl font-semibold text-ink">Profile</h1>
        <p className="text-sm text-muted mt-1">View your profile information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        {/* Header with status */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {profile.ownerName ? profile.ownerName[0].toUpperCase() : '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">{profile.ownerName}</h2>
              <p className="text-sm text-muted">{profile.shopName}</p>
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
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiPhone className="w-4 h-4 text-muted" />
                  <span className="text-sm text-ink">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiMail className="w-4 h-4 text-muted" />
                  <span className="text-sm text-ink">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiMapPin className="w-4 h-4 text-muted" />
                  <span className="text-sm text-ink">{profile.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-4 h-4 text-muted" />
                  <span className="text-sm text-ink">Joined: {profile.joined}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                Account Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-danger-soft rounded-lg border border-danger/20">
                  <span className="text-sm font-medium text-danger">Outstanding</span>
                  <span className="text-sm font-bold text-danger">
                    {formatCurrency(profile.outstanding)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Status</span>
                  <Badge variant={profile.status?.toLowerCase() === 'active' ? 'success' : 'default'}>
                    {profile.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-cream rounded-lg">
                  <span className="text-sm text-muted">Shop Area</span>
                  <span className="text-sm font-medium text-ink">
                    {profile.area}, {profile.city}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-cream rounded-lg">
                  <span className="text-sm text-muted">Pincode</span>
                  <span className="text-sm font-medium text-ink">{profile.pincode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 pt-6 border-t border-line">
            <p className="text-xs text-muted text-center">
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