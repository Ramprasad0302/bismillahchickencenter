import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import { FiLoader, FiAlertCircle, FiCheck } from 'react-icons/fi';
import api from '../../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ============================================
  // STATE FOR EACH TAB
  // ============================================
  const [businessData, setBusinessData] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: ''
  });

  const [accountData, setAccountData] = useState({
    name: '',
    phone: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    order: true,
    payment: true,
    delivery: false
  });

  const tabs = [
    { id: 'business', label: 'Business' },
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
  ];

  // ============================================
  // FETCH DATA ON MOUNT & TAB CHANGE
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        if (activeTab === 'business') {
          const res = await api.get('/settings/business');
          if (res.data.success) setBusinessData(res.data.data);
        } else if (activeTab === 'account') {
          const res = await api.get('/settings/account');
          if (res.data.success) setAccountData(res.data.data);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  // ============================================
  // HANDLERS FOR SAVING
  // ============================================
  const handleSaveBusiness = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await api.put('/settings/business', businessData);
      setSuccess(res.data.message);
    } catch (err) {
      setError('Failed to save business settings.');
    } finally { setSaving(false); }
  };

  const handleSaveAccount = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await api.put('/settings/account', accountData);
      setSuccess(res.data.message);
    } catch (err) {
      setError('Failed to save account settings.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setSaving(true); setError(null); setSuccess(null);
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match.');
      setSaving(false);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setSaving(false);
      return;
    }
    try {
      const res = await api.put('/settings/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess(res.data.message);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally { setSaving(false); }
  };

  const handleSaveNotifications = () => {
    setSaving(true); setError(null); setSuccess(null);
    // Simulating an API call here
    setTimeout(() => {
      setSuccess('Notification preferences saved!');
      setSaving(false);
    }, 500);
  };

  // ============================================
  // TOGGLE NOTIFICATION SWITCH
  // ============================================
  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-6">Settings</h1>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        <div className="border-b border-line">
          <div className="flex gap-1 px-6 py-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-brand text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-danger-soft border border-danger/20 rounded-lg flex items-center gap-2 text-danger text-sm">
              <FiAlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-success-soft border border-success/20 rounded-lg flex items-center gap-2 text-success text-sm">
              <FiCheck className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="flex justify-center py-4">
              <FiLoader className="w-6 h-6 animate-spin text-success" />
            </div>
          )}

          {/* BUSINESS TAB */}
          {activeTab === 'business' && !loading && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Business Name</label>
                <input
                  type="text"
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Phone</label>
                <input
                  type="text"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Email</label>
                <input
                  type="email"
                  value={businessData.email}
                  onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Address</label>
                <textarea
                  rows="3"
                  value={businessData.address}
                  onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <Button onClick={handleSaveBusiness} disabled={saving}>
                {saving ? <><FiLoader className="animate-spin mr-2 w-4 h-4" /> Saving...</> : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && !loading && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Admin Name</label>
                <input
                  type="text"
                  value={accountData.name}
                  onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Phone</label>
                <input
                  type="text"
                  value={accountData.phone}
                  onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <Button onClick={handleSaveAccount} disabled={saving}>
                {saving ? <><FiLoader className="animate-spin mr-2 w-4 h-4" /> Updating...</> : 'Update Account'}
              </Button>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && !loading && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={saving}>
                {saving ? <><FiLoader className="animate-spin mr-2 w-4 h-4" /> Changing...</> : 'Change Password'}
              </Button>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && !loading && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">Order Notifications</p>
                  <p className="text-sm text-muted">Receive alerts when new orders are placed</p>
                </div>
                <button 
                  onClick={() => toggleNotification('order')}
                  className={`relative w-12 h-6 rounded-full transition ${notifications.order ? 'bg-brand' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${notifications.order ? 'right-1' : 'left-1'}`}></span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">Payment Notifications</p>
                  <p className="text-sm text-muted">Receive alerts for payment receipts</p>
                </div>
                <button 
                  onClick={() => toggleNotification('payment')}
                  className={`relative w-12 h-6 rounded-full transition ${notifications.payment ? 'bg-brand' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${notifications.payment ? 'right-1' : 'left-1'}`}></span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">Delivery Notifications</p>
                  <p className="text-sm text-muted">Receive updates on delivery status</p>
                </div>
                <button 
                  onClick={() => toggleNotification('delivery')}
                  className={`relative w-12 h-6 rounded-full transition ${notifications.delivery ? 'bg-brand' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${notifications.delivery ? 'right-1' : 'left-1'}`}></span>
                </button>
              </div>
              <div className="pt-4 border-t border-line">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? <><FiLoader className="animate-spin mr-2 w-4 h-4" /> Saving...</> : 'Save Preferences'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;