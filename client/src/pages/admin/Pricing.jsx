import { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiEdit2, 
  FiSave, 
  FiX, 
  FiUsers,
  FiClock,
  FiTrendingUp,
  FiUser,
  FiCheck,
  FiAlertCircle,
  FiLoader
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';
import api from '../../services/api';

// Helper to format dates nicely
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('-');
  const [userPrices, setUserPrices] = useState([]);
  const [customPriceUsers, setCustomPriceUsers] = useState(0);
  
  const [avgWeight, setAvgWeight] = useState(null);

  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [editAvgWeightValue, setEditAvgWeightValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customPriceValue, setCustomPriceValue] = useState('');
  
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [priceHistoryList, setPriceHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // ============================================
  // 1. FETCH DATA FROM BACKEND
  // ============================================
  const fetchPricingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/pricing/admin-data');
      
      if (response.data.success) {
        const { globalPrice, avgWeight: fetchedAvgWeight, lastUpdated, retailers } = response.data;
        
        setCurrentPrice(globalPrice);
        setAvgWeight(fetchedAvgWeight ?? null);
        setLastUpdated(formatDate(lastUpdated));
        setUserPrices(retailers);
        
        // Calculate custom price user count
        const customCount = retailers.filter(r => r.custom_price > 0).length;
        setCustomPriceUsers(customCount);
        
        // Update edit inputs to match current
        setEditPriceValue(globalPrice);
        setEditAvgWeightValue(fetchedAvgWeight ?? '');
      }
    } catch (err) {
      console.error('Error fetching pricing data:', err);
      setError('Failed to load pricing data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  // ============================================
  // 2. UPDATE GLOBAL PRICE
  // ============================================
  const handleDefaultPriceUpdate = async () => {
    const newPrice = parseFloat(editPriceValue);
    if (!newPrice || newPrice <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    // Average weight is optional — leaving it blank keeps the existing value.
    let newAvgWeight;
    if (editAvgWeightValue !== '' && editAvgWeightValue !== null) {
      newAvgWeight = parseFloat(editAvgWeightValue);
      if (Number.isNaN(newAvgWeight) || newAvgWeight <= 0) {
        alert('Please enter a valid average weight greater than 0');
        return;
      }
    }

    try {
      const response = await api.post('/pricing/global', {
        price: newPrice,
        avgWeight: newAvgWeight,
      });
      if (response.data.success) {
        alert('Global pricing updated successfully!');
        setIsEditingDefault(false);
        fetchPricingData(); // Refresh data from server
      }
    } catch (err) {
      console.error('Error updating global pricing:', err);
      alert(err.response?.data?.message || 'Failed to update global pricing. Please try again.');
    }
  };

  // ============================================
  // 3. UPDATE CUSTOM PRICE
  // ============================================
  const handleUserPriceUpdate = async () => {
    if (!selectedUser) return;
    
    const newPrice = parseFloat(customPriceValue);
    if (!newPrice || newPrice <= 0) {
      alert('Please enter a valid custom price greater than 0');
      return;
    }

    try {
      const response = await api.post('/pricing/custom', { 
        retailer_id: selectedUser.id, 
        custom_price: newPrice 
      });
      
      if (response.data.success) {
        setIsUserModalOpen(false);
        setSelectedUser(null);
        setCustomPriceValue('');
        fetchPricingData(); // Refresh data from server
        alert('Custom price updated successfully!');
      }
    } catch (err) {
      console.error('Error updating custom price:', err);
      alert('Failed to update custom price. Please try again.');
    }
  };

  // ============================================
  // 4. REMOVE (REVERT) CUSTOM PRICE
  // ============================================
  const removeCustomPrice = async (userId) => {
    if (!confirm('Are you sure you want to revert this retailer back to the default global price?')) return;

    try {
      const response = await api.delete(`/pricing/custom/${userId}`);
      if (response.data.success) {
        fetchPricingData(); // Refresh data from server
      }
    } catch (err) {
      console.error('Error reverting price:', err);
      alert('Failed to revert price. Please try again.');
    }
  };

  // ============================================
  // 5. PRICE HISTORY
  // ============================================
  const openPriceHistory = async () => {
    setIsPriceHistoryOpen(true);
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await api.get('/pricing/history');
      if (response.data.success) {
        setPriceHistoryList(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching price history:', err);
      setHistoryError('Failed to load price history.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // ============================================
  // 6. OPEN MODALS
  // ============================================
  const openUserPriceModal = (user) => {
    setSelectedUser(user);
    // If they have a custom price, pre-fill it. Otherwise, show 0 or empty.
    setCustomPriceValue(user.custom_price > 0 ? user.custom_price.toString() : '');
    setIsUserModalOpen(true);
  };

  // Filter users based on search
  const filteredUsers = userPrices.filter(user => 
    user.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 text-[#111714] animate-spin" />
        <p className="mt-4 text-[#6B716D]">Loading pricing data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#D14343]" />
        <p className="mt-4 text-[#D14343] font-medium">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={fetchPricingData}
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
          <h1 className="text-2xl font-semibold text-[#151A17]">Price Management</h1>
          <p className="text-sm text-[#6B716D] mt-1">Set today's per-kg rates. Changes apply instantly to the current price.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={openPriceHistory}
          >
            View History
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPricingData}>
            <FiLoader className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Default Price Card */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#F6F7F6] rounded-lg">
                <FiDollarSign className="w-5 h-5 text-[#111714]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#6B716D]">DEFAULT PRICE</p>
                <p className="text-xs text-[#6B716D]">Rate for all retailers (unless custom price is set)</p>
              </div>
            </div>
            
            {isEditingDefault ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-bold text-[#151A17]">₹</span>
                <input
                  type="number"
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(e.target.value)}
                  className="w-32 px-4 py-2 text-2xl font-bold border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
                  min="0"
                  step="1"
                />
                <span className="text-sm text-[#6B716D]">/ kg</span>
              </div>
            ) : (
              <div className="mt-2">
                <span className="text-4xl font-bold text-[#151A17]">₹{currentPrice}</span>
                <span className="ml-2 text-sm text-[#6B716D]">/ kg</span>
              </div>
            )}

            {/* Average weight per bird — global, shown to retailers */}
            {isEditingDefault ? (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#151A17] mb-1">
                  Average weight per bird
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={editAvgWeightValue}
                    onChange={(e) => setEditAvgWeightValue(e.target.value)}
                    className="w-32 px-4 py-2 text-lg font-semibold border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1.80"
                  />
                  <span className="text-sm text-[#6B716D]">kg / bird</span>
                </div>
                <p className="text-xs text-[#6B716D] mt-1">
                  Leave blank to keep the current value.
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <span className="text-sm text-[#6B716D]">Average weight per bird: </span>
                <span className="text-lg font-semibold text-[#151A17]">
                  {avgWeight !== null && avgWeight !== undefined
                    ? `${avgWeight} kg`
                    : 'Not set'}
                </span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            {isEditingDefault ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingDefault(false);
                    setEditPriceValue(currentPrice);
                    setEditAvgWeightValue(avgWeight ?? '');
                  }}
                >
                  <FiX className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDefaultPriceUpdate}
                >
                  <FiSave className="w-4 h-4 mr-1" />
                  Save Pricing
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingDefault(true);
                  setEditPriceValue(currentPrice);
                  setEditAvgWeightValue(avgWeight ?? '');
                }}
              >
                <FiEdit2 className="w-4 h-4 mr-1" />
                Update Pricing
              </Button>
            )}
            <p className="text-xs text-[#6B716D] mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        {/* Quick update info */}
        <div className="mt-4 pt-4 border-t border-[#E5E8E6]">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4 text-[#16834B]" />
              <span className="text-[#6B716D]">Default Price:</span>
              <span className="font-medium text-[#151A17]">₹{currentPrice}/kg</span>
            </div>
            <div className="flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-[#3B6FD8]" />
              <span className="text-[#6B716D]">Custom Prices:</span>
              <span className="font-medium text-[#151A17]">{customPriceUsers} users</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Custom Prices Section */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8E6] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#151A17]">User Custom Prices</h2>
            <p className="text-sm text-[#6B716D]">Set different prices for individual retailers</p>
          </div>
          <div className="w-64">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F6F7F6]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Default Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Custom Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E6]">
              {filteredUsers.map((user) => {
                const isCustom = user.custom_price > 0;
                return (
                  <tr key={user.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#151A17]">{user.shop_name}</p>
                        <p className="text-xs text-[#6B716D]">{user.owner_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      ₹{currentPrice}/kg
                    </td>
                    <td className="px-6 py-4">
                      {isCustom ? (
                        <span className="text-sm font-semibold text-[#3B6FD8]">
                          ₹{user.custom_price}/kg
                        </span>
                      ) : (
                        <span className="text-sm text-[#6B716D]">₹{currentPrice}/kg</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isCustom ? (
                        <Badge variant="info">Custom</Badge>
                      ) : (
                        <Badge variant="default">Default</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">
                      {formatDate(user.custom_price_updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isCustom && (
                          <button
                            onClick={() => removeCustomPrice(user.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Remove Custom Price"
                          >
                            <FiX className="w-4 h-4 text-[#D14343]" />
                          </button>
                        )}
                        <button
                          onClick={() => openUserPriceModal(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                          title={isCustom ? "Edit Custom Price" : "Set Custom Price"}
                        >
                          <FiEdit2 className="w-4 h-4 text-[#6B716D]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Price Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
          setCustomPriceValue('');
        }}
        title={selectedUser?.custom_price > 0 ? "Edit Custom Price" : "Set Custom Price"}
        description={`Set custom price for ${selectedUser?.shop_name} (${selectedUser?.owner_name})`}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUserModalOpen(false);
                setSelectedUser(null);
                setCustomPriceValue('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUserPriceUpdate}>
              {selectedUser?.custom_price > 0 ? "Update Price" : "Set Price"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#F6F7F6] rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#6B716D]">Default Price</p>
                <p className="font-semibold text-[#151A17]">₹{currentPrice}/kg</p>
              </div>
              <div>
                <p className="text-[#6B716D]">Current Custom Price</p>
                <p className="font-semibold text-[#151A17]">
                  {selectedUser?.custom_price > 0 ? `₹${selectedUser?.custom_price}/kg` : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Custom Price (₹/kg)
            </label>
            <input
              type="number"
              value={customPriceValue}
              onChange={(e) => setCustomPriceValue(e.target.value)}
              placeholder="Enter custom price"
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
              min="0"
              step="1"
            />
            <p className="mt-2 text-xs text-[#6B716D]">
              <FiAlertCircle className="inline w-3 h-3 mr-1" />
              Current default price is ₹{currentPrice}/kg
            </p>
          </div>
        </div>
      </Modal>

      {/* Price History Modal */}
      <Modal
        isOpen={isPriceHistoryOpen}
        onClose={() => setIsPriceHistoryOpen(false)}
        title="Price History"
        description="Every change to the default price and average hen weight, most recent first"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setIsPriceHistoryOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 max-h-[450px] overflow-y-auto">
          {isHistoryLoading && (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="w-8 h-8 animate-spin text-[#16834B]" />
            </div>
          )}

          {!isHistoryLoading && historyError && (
            <div className="p-8 text-center">
              <FiAlertCircle className="w-8 h-8 text-[#D14343] mx-auto mb-2" />
              <p className="text-[#D14343] text-sm">{historyError}</p>
            </div>
          )}

          {!isHistoryLoading && !historyError && priceHistoryList.length === 0 && (
            <div className="p-8 text-center text-[#6B716D]">
              <p>No price changes recorded yet.</p>
            </div>
          )}

          {!isHistoryLoading && !historyError && priceHistoryList.map((entry, idx) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                idx === 0 ? 'border-[#16834B] bg-[#EAF6EF]' : 'border-[#E5E8E6] bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-[#E5E8E6] shrink-0">
                  <FiTrendingUp className="w-4 h-4 text-[#16834B]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#151A17]">₹{entry.price}/kg</span>
                    {entry.avgWeight !== null && (
                      <span className="text-sm text-[#6B716D]">· {entry.avgWeight} kg/hen avg</span>
                    )}
                    {idx === 0 && (
                      <Badge variant="success">Current</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#6B716D] mt-0.5">
                    Set by {entry.updatedBy} · {formatDate(entry.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Pricing;