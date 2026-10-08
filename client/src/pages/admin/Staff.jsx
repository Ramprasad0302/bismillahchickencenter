import { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiX,
  FiCheck,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiTruck,
  FiUser,
  FiFilter,
  FiSearch,
  FiEye,
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart2,
  FiLoader
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import { staffService } from '../../services/staffService';
import BrandLoader from '../../components/brand/BrandLoader';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'Driver',
    dailySalary: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load staff data from database
  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await staffService.getAllStaff();
      if (response.success) {
        // Format staff data to match frontend structure
        const formattedStaff = response.data.map(staff => ({
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          role: staff.role.charAt(0).toUpperCase() + staff.role.slice(1),
          vehicle: '-',
          dailySalary: parseFloat(staff.dailySalary),
          status: staff.status.charAt(0).toUpperCase() + staff.status.slice(1),
          joinDate: staff.joinDate ? new Date(staff.joinDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }) : 'N/A',
          totalTrips: 0,
          tripsThisMonth: 0,
          salaryThisMonth: 0,
          trips: []
        }));
        setStaff(formattedStaff);
      } else {
        setError('Failed to load staff members');
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      setError(error.message || 'Error loading staff members');
    } finally {
      setLoading(false);
    }
  };

  // Filter staff
  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.phone.includes(searchTerm);
    const matchesRole = selectedRole === 'all' || s.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Statistics
  const totalStaff = staff.length;
  const totalDrivers = staff.filter(s => s.role === 'Driver').length;
  const totalCleaners = staff.filter(s => s.role === 'Cleaner').length;
  const activeStaff = staff.filter(s => s.status === 'Active').length;
  const totalSalaryThisMonth = staff.reduce((sum, s) => sum + s.salaryThisMonth, 0);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (formData.phone.length < 10) errors.phone = 'Phone must be 10 digits';
    if (!formData.dailySalary || parseFloat(formData.dailySalary) <= 0) {
      errors.dailySalary = 'Valid daily salary is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add staff
  const handleAddStaff = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const staffData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        role: formData.role.toLowerCase(),
        dailySalary: parseFloat(formData.dailySalary),
        status: formData.status
      };
      
      const response = await staffService.addStaff(staffData);
      
      if (response.success) {
        await loadStaff(); // Refresh the list
        setIsAddModalOpen(false);
        resetForm();
        alert('Staff member added successfully!');
      } else {
        alert(response.message || 'Failed to add staff member');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert(error.message || 'Error adding staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit staff
  const handleEditStaff = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const staffData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        role: formData.role.toLowerCase(),
        dailySalary: parseFloat(formData.dailySalary),
        status: formData.status
      };
      
      const response = await staffService.updateStaff(selectedStaff.id, staffData);
      
      if (response.success) {
        await loadStaff(); // Refresh the list
        setIsEditModalOpen(false);
        resetForm();
        alert('Staff member updated successfully!');
      } else {
        alert(response.message || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert(error.message || 'Error updating staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete staff
  const handleDeleteStaff = async () => {
    setIsSubmitting(true);
    try {
      const response = await staffService.deleteStaff(selectedStaff.id);
      
      if (response.success) {
        await loadStaff(); // Refresh the list
        setIsDeleteModalOpen(false);
        resetForm();
        alert('Staff member removed successfully!');
      } else {
        alert(response.message || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert(error.message || 'Error deleting staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle staff status
  const toggleStatus = async (staffId) => {
    try {
      const staffMember = staff.find(s => s.id === staffId);
      const newStatus = staffMember.status === 'Active' ? 'inactive' : 'active';
      
      const response = await staffService.toggleStatus(staffId, newStatus);
      
      if (response.success) {
        await loadStaff(); // Refresh the list
      } else {
        alert('Failed to update staff status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error updating staff status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      role: 'Driver',
      dailySalary: '',
      status: 'active',
    });
    setFormErrors({});
    setSelectedStaff(null);
  };

  // Open edit modal
  const openEditModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setFormData({
      name: staffMember.name,
      phone: staffMember.phone,
      role: staffMember.role,
      dailySalary: staffMember.dailySalary.toString(),
      status: staffMember.status.toLowerCase(),
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setIsDeleteModalOpen(true);
  };

  // Open view modal
  const openViewModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setIsViewModalOpen(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BrandLoader />
          <p className="text-muted">Loading staff members...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Staff Management</h1>
          <p className="text-sm text-muted mt-1">Manage drivers, cleaners, and their salaries</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsAddModalOpen(true);
        }}>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <p className="text-xs text-muted">Total Staff</p>
          <p className="text-xl font-semibold text-ink">{totalStaff}</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <p className="text-xs text-muted">Drivers</p>
          <p className="text-xl font-semibold text-ink">{totalDrivers}</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <p className="text-xs text-muted">Cleaners</p>
          <p className="text-xl font-semibold text-ink">{totalCleaners}</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <p className="text-xs text-muted">Active</p>
          <p className="text-xl font-semibold text-success">{activeStaff}</p>
        </div>
        <div className="bg-white rounded-xl border border-line p-4 text-center">
          <p className="text-xs text-muted">Salary This Month</p>
          <p className="text-xl font-semibold text-ink">{formatCurrency(totalSalaryThisMonth)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-line p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone..."
              className="max-w-md"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2.5 border border-line rounded-lg bg-white focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="all">All Roles</option>
              <option value="Driver">Driver</option>
              <option value="Cleaner">Cleaner</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staffMember) => (
            <div key={staffMember.id} className="bg-white rounded-xl border border-line p-6 hover:shadow-md transition">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    staffMember.role === 'Driver' ? 'bg-blue-50' : 'bg-green-50'
                  }`}>
                    {staffMember.role === 'Driver' ? (
                      <FiTruck className={`w-5 h-5 ${staffMember.role === 'Driver' ? 'text-blue-600' : 'text-green-600'}`} />
                    ) : (
                      <FiUser className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{staffMember.name}</h3>
                    <p className="text-xs text-muted">{staffMember.phone}</p>
                  </div>
                </div>
                <Badge variant={staffMember.status === 'Active' ? 'success' : 'default'}>
                  {staffMember.status}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Role</span>
                  <span className="font-medium text-ink">{staffMember.role}</span>
                </div>
                {staffMember.role === 'Driver' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Vehicle</span>
                    <span className="font-medium text-ink">{staffMember.vehicle || 'Not assigned'}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Daily Salary</span>
                  <span className="font-medium text-ink">{formatCurrency(staffMember.dailySalary)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Join Date</span>
                  <span className="font-medium text-ink">{staffMember.joinDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  onClick={() => openViewModal(staffMember)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="View Details"
                >
                  <FiEye className="w-4 h-4 text-muted" />
                </button>
                <button
                  onClick={() => toggleStatus(staffMember.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    staffMember.status === 'Active'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-success text-white hover:bg-success-dark'
                  }`}
                >
                  {staffMember.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => openEditModal(staffMember)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Edit Staff"
                >
                  <FiEdit2 className="w-4 h-4 text-muted" />
                </button>
                <button
                  onClick={() => openDeleteModal(staffMember)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                  title="Remove Staff"
                >
                  <FiTrash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={staff.length === 0 ? "No staff members added yet" : "No staff found"}
          description={staff.length === 0 
            ? "Start by adding your first staff member." 
            : "Try adjusting your search or filter criteria."}
          icon={FiUsers}
          action={
            <Button onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}>
              <FiPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          }
        />
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Staff"
        description="Add a new staff member (Driver or Cleaner)"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStaff} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add Staff
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter full name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.name ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-danger">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Phone Number <span className="text-danger">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-line rounded-l-lg bg-gray-50 text-muted">
                +91
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit phone number"
                className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                  formErrors.phone ? 'border-danger' : 'border-line'
                }`}
              />
            </div>
            {formErrors.phone && (
              <p className="mt-1 text-sm text-danger">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Role <span className="text-danger">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="Driver">Driver</option>
              <option value="Cleaner">Cleaner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Daily Salary (₹) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="dailySalary"
              value={formData.dailySalary}
              onChange={handleInputChange}
              placeholder="e.g., 500"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.dailySalary ? 'border-danger' : 'border-line'
              }`}
              min="0"
              step="1"
            />
            {formErrors.dailySalary && (
              <p className="mt-1 text-sm text-danger">{formErrors.dailySalary}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Staff"
        description="Update staff member details"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditStaff} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FiEdit2 className="w-4 h-4 mr-2" />
                  Update Staff
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.name ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-danger">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Phone Number <span className="text-danger">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-line rounded-l-lg bg-gray-50 text-muted">
                +91
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                  formErrors.phone ? 'border-danger' : 'border-line'
                }`}
              />
            </div>
            {formErrors.phone && (
              <p className="mt-1 text-sm text-danger">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Role <span className="text-danger">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="Driver">Driver</option>
              <option value="Cleaner">Cleaner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Daily Salary (₹) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="dailySalary"
              value={formData.dailySalary}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.dailySalary ? 'border-danger' : 'border-line'
              }`}
              min="0"
              step="1"
            />
            {formErrors.dailySalary && (
              <p className="mt-1 text-sm text-danger">{formErrors.dailySalary}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Staff Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          resetForm();
        }}
        title="Remove Staff"
        description={`Are you sure you want to remove ${selectedStaff?.name}? This action cannot be undone.`}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteStaff} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <FiTrash2 className="w-4 h-4 mr-2" />
                  Remove Staff
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="p-4 bg-danger-soft rounded-lg border border-danger/20">
          <p className="text-sm text-danger">
            <FiTrash2 className="inline w-4 h-4 mr-2" />
            This will permanently remove {selectedStaff?.name} from the staff list.
          </p>
        </div>
      </Modal>

      {/* View Staff Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStaff(null);
        }}
        title={selectedStaff?.name}
        description={`${selectedStaff?.role} • ${selectedStaff?.phone}`}
        size="lg"
        footer={
          <Button variant="outline" onClick={() => {
            setIsViewModalOpen(false);
            setSelectedStaff(null);
          }}>
            Close
          </Button>
        }
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-cream rounded-lg p-3 text-center">
                <p className="text-xs text-muted">Daily Salary</p>
                <p className="text-lg font-semibold text-ink">{formatCurrency(selectedStaff.dailySalary)}</p>
              </div>
              <div className="bg-cream rounded-lg p-3 text-center">
                <p className="text-xs text-muted">Total Trips</p>
                <p className="text-lg font-semibold text-ink">{selectedStaff.totalTrips}</p>
              </div>
              <div className="bg-cream rounded-lg p-3 text-center">
                <p className="text-xs text-muted">Trips This Month</p>
                <p className="text-lg font-semibold text-ink">{selectedStaff.tripsThisMonth}</p>
              </div>
              <div className="bg-cream rounded-lg p-3 text-center">
                <p className="text-xs text-muted">Salary This Month</p>
                <p className="text-lg font-semibold text-success">{formatCurrency(selectedStaff.salaryThisMonth)}</p>
              </div>
            </div>

            {/* Trip History */}
            <div>
              <h4 className="font-medium text-ink mb-3">Trip History</h4>
              {selectedStaff.trips && selectedStaff.trips.length > 0 ? (
                <div className="border border-line rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-cream">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Trip ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {selectedStaff.trips.map((trip) => (
                        <tr key={trip.tripId} className="hover:bg-cream transition">
                          <td className="px-4 py-2 text-sm text-muted">{trip.date}</td>
                          <td className="px-4 py-2 text-sm font-medium text-ink">{trip.tripId}</td>
                          <td className="px-4 py-2 text-sm text-ink">{trip.role}</td>
                          <td className="px-4 py-2">
                            <Badge variant={trip.status === 'Completed' ? 'success' : 'warning'}>
                              {trip.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <p>No trips assigned yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Staff;