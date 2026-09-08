import { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiPhone,
  FiShoppingBag,
  FiDownload,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Fetching retailer customers...');
      const response = await api.get('/retailers/customers');
      console.log('✅ Customers fetched:', response.data);
      
      if (response.data.success) {
        setCustomers(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to fetch customers');
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred while fetching customers.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search and status
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || 
                         customer.status?.toLowerCase() === selectedStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
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

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiLoader className="w-12 h-12 text-[#111714] animate-spin" />
        <p className="mt-4 text-[#6B716D]">Loading customers...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FiAlertCircle className="w-12 h-12 text-[#D14343]" />
        <p className="mt-4 text-[#D14343] font-medium">{error}</p>
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={fetchCustomers}
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Customers</h1>
          <p className="text-sm text-[#6B716D] mt-1">
            {customers.length} retailers on the network
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchCustomers}
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <FiDownload className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, shop, phone..."
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 border border-[#E5E8E6] rounded-lg bg-white focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Outstanding</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Total Purchase</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#151A17]">{customer.shop_name}</p>
                        <p className="text-xs text-[#6B716D]">{customer.owner_name}</p>
                        {customer.city && (
                          <p className="text-xs text-[#6B716D] mt-0.5">{customer.city}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-3 h-3 text-[#6B716D]" />
                        <span className="text-sm text-[#151A17]">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        parseFloat(customer.outstanding) > 0 ? 'text-[#D14343]' : 'text-[#16834B]'
                      }`}>
                        {formatCurrency(customer.outstanding)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#151A17]">
                      {formatCurrency(customer.total_purchase)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiShoppingBag className="w-3 h-3 text-[#6B716D]" />
                        <span className="text-sm text-[#151A17]">{customer.total_orders || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={customer.status === 'active' ? 'success' : 'default'}>
                        {customer.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={searchTerm || selectedStatus !== 'all' ? "No customers found" : "No customers yet"}
            description={searchTerm || selectedStatus !== 'all' 
              ? "Try adjusting your search or filter criteria."
              : "Add your first retailer to get started."}
            icon={FiUsers}
          />
        )}
      </div>
    </div>
  );
};

export default Customers;