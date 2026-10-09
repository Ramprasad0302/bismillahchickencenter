import { useState, useEffect } from 'react';
import { 
  FiUser, 
  FiPhone, 
  FiTruck,
  FiCalendar,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import api from '../../services/api';
import BrandLoader from '../../components/brand/BrandLoader';

const DriverProfile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    vehicle_number: '',
    vehicle_name: '',
    vehicle_type: '',
    status: 'Available',
    joined: '',
  });

  // ✅ Fetch Real Data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/driver/profile');
        if (response.data.success) {
          const data = response.data.data;
          setProfile({
            name: data.name || 'Driver',
            phone: data.phone || '-',
            vehicle_number: data.vehicle_number || 'Not assigned',
            vehicle_name: data.vehicle_name || 'N/A',
            vehicle_type: data.vehicle_type || 'N/A',
            status: data.status || 'available',
            joined: data.joined_date 
              ? new Date(data.joined_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })
              : '-',
          });
        } else {
          setError('Failed to load profile.');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Could not connect to server.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Format status badge color
  const getStatusVariant = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'available') return 'success';
    if (s === 'on_delivery') return 'info';
    if (s === 'inactive') return 'error';
    return 'default';
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BrandLoader />
        <p className="mt-4 text-muted">Loading profile...</p>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-danger" />
        <p className="mt-4 text-danger font-medium">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

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
              <span className="text-2xl font-bold text-white">{profile.name[0]}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">{profile.name}</h2>
              <p className="text-sm text-muted">{profile.vehicle_name}</p>
            </div>
          </div>
          <Badge variant={getStatusVariant(profile.status)}>
            {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
          </Badge>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Personal Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FiPhone className="w-4 h-4 text-muted" />
              <span className="text-sm text-ink">{profile.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <FiTruck className="w-4 h-4 text-muted" />
              <span className="text-sm text-ink">
                {profile.vehicle_number} ({profile.vehicle_type})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FiCalendar className="w-4 h-4 text-muted" />
              <span className="text-sm text-ink">Joined: {profile.joined}</span>
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

export default DriverProfile;