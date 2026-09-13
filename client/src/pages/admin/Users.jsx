import { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiUserCheck, 
  FiUserX,
  FiSearch,
  FiFilter,
  FiMail,
  FiPhone,
  FiShield,
  FiClock,
  FiMoreVertical,
  FiKey,
  FiUser,
  FiLoader
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { userService } from '../../services/userService';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'retailer',
    password: '',
    confirmPassword: '',
    openingOutstanding: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load users from database
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userService.getAllUsers();
      if (response.success) {
        // Format user data to match frontend structure
        const formattedUsers = response.data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email || 'N/A',
          phone: user.phone,
          role: user.role,
          status: user.status.charAt(0).toUpperCase() + user.status.slice(1),
          lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
          createdAt: user.createdAt || 'N/A'
        }));
        setUsers(formattedUsers);
      } else {
        setError('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError(error.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          user.phone.includes(searchTerm);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get role badge color
  const getRoleBadgeVariant = (role) => {
    const variants = {
      admin: 'primary',
      retailer: 'info',
      driver: 'warning',
    };
    return variants[role] || 'default';
  };

  // Get role icon
  const getRoleIcon = (role) => {
    const icons = {
      admin: <FiShield className="w-4 h-4" />,
      retailer: <FiUser className="w-4 h-4" />,
      driver: <FiUser className="w-4 h-4" />,
    };
    return icons[role] || <FiUser className="w-4 h-4" />;
  };

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
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (formData.phone.length < 10) errors.phone = 'Phone must be 10 digits';
    if (!formData.role) errors.role = 'Role is required';
    if (
      formData.role === 'retailer' &&
      formData.openingOutstanding !== '' &&
      (Number.isNaN(parseFloat(formData.openingOutstanding)) || parseFloat(formData.openingOutstanding) < 0)
    ) {
      errors.openingOutstanding = 'Enter a valid amount 0 or greater';
    }
    if (!isEditModalOpen) {
      if (!formData.password) errors.password = 'Password is required';
      if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password,
        // Only meaningful for retailers -- the backend ignores it for
        // admin/driver accounts. Sent as-is (including '') and the backend
        // treats a blank/zero value as "no opening balance".
        openingOutstanding: formData.role === 'retailer' ? formData.openingOutstanding : '',
      };
      
      const response = await userService.createUser(userData);
      
      if (response.success) {
        await loadUsers();
        setIsCreateModalOpen(false);
        resetForm();
        alert('User created successfully! Login credentials have been sent to the user.');
      } else {
        alert(response.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.message || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        status: formData.status
      };
      
      const response = await userService.updateUser(selectedUser.id, userData);
      
      if (response.success) {
        await loadUsers();
        setIsEditModalOpen(false);
        resetForm();
        alert('User updated successfully!');
      } else {
        alert(response.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error.message || 'Error updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    setIsSubmitting(true);
    try {
      const response = await userService.deleteUser(selectedUser.id);
      
      if (response.success) {
        await loadUsers();
        setIsDeleteModalOpen(false);
        resetForm();
        alert('User deleted successfully!');
      } else {
        alert(response.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Error deleting user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle user status
  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'Active' ? 'inactive' : 'active';
      
      const response = await userService.toggleStatus(user.id, newStatus);
      
      if (response.success) {
        await loadUsers();
      } else {
        alert(response.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert(error.message || 'Error updating user status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'retailer',
      password: '',
      confirmPassword: '',
      status: 'active',
      openingOutstanding: '',
    });
    setFormErrors({});
    setSelectedUser(null);
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: '',
      confirmPassword: '',
      status: user.status.toLowerCase(),
      openingOutstanding: '',
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Get role options for form
  const roleOptions = [
    { value: 'admin', label: 'Administrator' },
    { value: 'retailer', label: 'Retailer' },
    { value: 'driver', label: 'Driver' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-[#16834B] mx-auto mb-4" />
          <p className="text-[#6B716D]">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">User Management</h1>
          <p className="text-sm text-[#6B716D] mt-1">Manage user accounts and permissions</p>
        </div>
        <Button 
          icon={FiPlus} 
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
        >
          Create User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <p className="text-sm text-[#6B716D]">Total Users</p>
          <p className="text-2xl font-semibold text-[#151A17]">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <p className="text-sm text-[#6B716D]">Active Users</p>
          <p className="text-2xl font-semibold text-[#151A17]">
            {users.filter(u => u.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <p className="text-sm text-[#6B716D]">Admins</p>
          <p className="text-2xl font-semibold text-[#151A17]">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-6">
          <p className="text-sm text-[#6B716D]">Retailers & Drivers</p>
          <p className="text-2xl font-semibold text-[#151A17]">
            {users.filter(u => u.role !== 'admin').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name, email, or phone..."
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2.5 border border-[#E5E8E6] rounded-lg bg-white focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="retailer">Retailer</option>
              <option value="driver">Driver</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 border border-[#E5E8E6] rounded-lg bg-white focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F7F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B716D] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E6]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F6F7F6] transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F6F7F6] flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#151A17]">{user.name}</p>
                          <p className="text-xs text-[#6B716D]">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-[#151A17]">{user.email}</p>
                        <p className="text-xs text-[#6B716D]">{user.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        <span className="capitalize">{user.role}</span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'Active' ? 'success' : 'default'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-sm text-[#6B716D]">{user.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                          title={user.status === 'Active' ? 'Disable User' : 'Enable User'}
                        >
                          {user.status === 'Active' ? (
                            <FiUserX className="w-4 h-4 text-[#D14343]" />
                          ) : (
                            <FiUserCheck className="w-4 h-4 text-[#16834B]" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                          title="Edit User"
                        >
                          <FiEdit2 className="w-4 h-4 text-[#6B716D]" />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-2 hover:bg-red-50 rounded-lg transition"
                            title="Delete User"
                          >
                            <FiTrash2 className="w-4 h-4 text-[#D14343]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No users found"
            description={users.length === 0 ? "Start by creating your first user." : "Try adjusting your search or filter criteria."}
            icon={FiUsers}
            action={
              <Button onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}>
                Create User
              </Button>
            }
          />
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New User"
        description="Add a new user to the system. They will receive login credentials."
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Full Name <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter full name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.name ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Email Address <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.email ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Phone Number <span className="text-[#D14343]">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-[#E5E8E6] rounded-l-lg bg-gray-50 text-[#6B716D]">
                +91
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit phone number"
                className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                  formErrors.phone ? 'border-[#D14343]' : 'border-[#E5E8E6]'
                }`}
              />
            </div>
            {formErrors.phone && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Role <span className="text-[#D14343]">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.role ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {formErrors.role && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.role}</p>
            )}
          </div>

          {/* Opening Outstanding -- retailers only. Lets the admin carry
              over a balance a shop already owed before being added to this
              system (from the previous Excel records), entered once at
              account creation. */}
          {formData.role === 'retailer' && (
            <div>
              <label className="block text-sm font-medium text-[#151A17] mb-1.5">
                Opening Outstanding Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B716D]">₹</span>
                <input
                  type="number"
                  name="openingOutstanding"
                  value={formData.openingOutstanding}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  step="1"
                  className={`w-full pl-8 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                    formErrors.openingOutstanding ? 'border-[#D14343]' : 'border-[#E5E8E6]'
                  }`}
                />
              </div>
              {formErrors.openingOutstanding && (
                <p className="mt-1 text-sm text-[#D14343]">{formErrors.openingOutstanding}</p>
              )}
              <p className="mt-1 text-xs text-[#6B716D]">
                If this shop already owed you money before joining the system, enter it here.
                This is a one-time entry — leave blank or 0 for a fresh account.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Password <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Minimum 6 characters"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.password ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Confirm Password <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm password"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.confirmPassword ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.confirmPassword}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit User"
        description="Update user information and permissions."
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
            <Button onClick={handleEditUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Full Name <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.name ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Email Address <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.email ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Phone Number <span className="text-[#D14343]">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-[#E5E8E6] rounded-l-lg bg-gray-50 text-[#6B716D]">
                +91
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                  formErrors.phone ? 'border-[#D14343]' : 'border-[#E5E8E6]'
                }`}
              />
            </div>
            {formErrors.phone && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Role <span className="text-[#D14343]">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition ${
                formErrors.role ? 'border-[#D14343]' : 'border-[#E5E8E6]'
              }`}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {formErrors.role && (
              <p className="mt-1 text-sm text-[#D14343]">{formErrors.role}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#151A17] mb-1.5">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-[#E5E8E6] rounded-lg focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="p-4 bg-[#F6F7F6] rounded-lg">
            <p className="text-sm text-[#6B716D]">
              <FiKey className="inline w-4 h-4 mr-2" />
              Leave password fields empty to keep current password.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          resetForm();
        }}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone.`}
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
            <Button variant="danger" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </>
        }
      >
        <div className="p-4 bg-[#FDEEEE] rounded-lg border border-[#D14343]/20">
          <p className="text-sm text-[#D14343]">
            <FiTrash2 className="inline w-4 h-4 mr-2" />
            This will permanently remove {selectedUser?.name} from the system.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Users;