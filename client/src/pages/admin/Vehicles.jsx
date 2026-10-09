import { useState, useEffect } from 'react';
import { 
  FiTruck, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiX,
  FiCheck,
  FiPackage,
  FiCalendar,
  FiTrendingUp,
  FiUsers,
  FiLoader
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import { vehicleService } from '../../services/vehicleService';
import BrandLoader from '../../components/brand/BrandLoader';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    type: '',
    capacity: '',
    fuelType: 'Diesel',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load vehicles from database
  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await vehicleService.getAllVehicles();
      if (response.success) {
        // Format vehicle data to match frontend structure
        const formattedVehicles = response.data.map(vehicle => ({
          id: vehicle.id,
          name: vehicle.name,
          number: vehicle.number,
          type: vehicle.type,
          capacity: parseFloat(vehicle.capacity),
          fuelType: vehicle.fuelType || 'Diesel',
          status: vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1),
          lastMaintenance: vehicle.lastMaintenance || '-',
          todayTrips: vehicle.todayTrips || 0,
          totalTrips: vehicle.totalTrips || 0
        }));
        setVehicles(formattedVehicles);
      } else {
        setError('Failed to load vehicles');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setError(error.message || 'Error loading vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (!formData.name.trim()) errors.name = 'Vehicle name is required';
    if (!formData.number.trim()) errors.number = 'Vehicle number is required';
    if (!formData.type.trim()) errors.type = 'Vehicle type is required';
    if (!formData.capacity || parseFloat(formData.capacity) <= 0) {
      errors.capacity = 'Valid capacity is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add vehicle
  const handleAddVehicle = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const vehicleData = {
        name: formData.name.trim(),
        number: formData.number.trim().toUpperCase(),
        type: formData.type.trim(),
        capacity: parseFloat(formData.capacity),
        fuelType: formData.fuelType,
        status: formData.status
      };
      
      const response = await vehicleService.addVehicle(vehicleData);
      
      if (response.success) {
        await loadVehicles();
        setIsAddModalOpen(false);
        resetForm();
        alert('Vehicle added successfully!');
      } else {
        alert(response.message || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert(error.message || 'Error adding vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit vehicle
  const handleEditVehicle = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const vehicleData = {
        name: formData.name.trim(),
        number: formData.number.trim().toUpperCase(),
        type: formData.type.trim(),
        capacity: parseFloat(formData.capacity),
        fuelType: formData.fuelType,
        status: formData.status
      };
      
      const response = await vehicleService.updateVehicle(selectedVehicle.id, vehicleData);
      
      if (response.success) {
        await loadVehicles();
        setIsEditModalOpen(false);
        resetForm();
        alert('Vehicle updated successfully!');
      } else {
        alert(response.message || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert(error.message || 'Error updating vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete vehicle
  const handleDeleteVehicle = async () => {
    setIsSubmitting(true);
    try {
      const response = await vehicleService.deleteVehicle(selectedVehicle.id);
      
      if (response.success) {
        await loadVehicles();
        setIsDeleteModalOpen(false);
        resetForm();
        alert('Vehicle removed successfully!');
      } else {
        alert(response.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert(error.message || 'Error deleting vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle vehicle status
  const toggleStatus = async (vehicleId) => {
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      const newStatus = vehicle.status === 'Active' ? 'inactive' : 'active';
      
      const response = await vehicleService.toggleStatus(vehicleId, newStatus);
      
      if (response.success) {
        await loadVehicles();
      } else {
        alert('Failed to update vehicle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error updating vehicle status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      number: '',
      type: '',
      capacity: '',
      fuelType: 'Diesel',
      status: 'active',
    });
    setFormErrors({});
    setSelectedVehicle(null);
  };

  // Open edit modal
  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      number: vehicle.number,
      type: vehicle.type,
      capacity: vehicle.capacity.toString(),
      fuelType: vehicle.fuelType || 'Diesel',
      status: vehicle.status.toLowerCase(),
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteModalOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BrandLoader />
          <p className="text-muted">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Fleet</h1>
          <p className="text-sm text-muted mt-1">{vehicles.length} vehicles across the delivery network</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsAddModalOpen(true);
        }}>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-line p-4 mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, number, or type..."
          className="max-w-md"
        />
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-xl border border-line p-6 hover:shadow-md transition">
              {/* Vehicle Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cream rounded-lg">
                    <FiTruck className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{vehicle.name}</h3>
                    <p className="text-sm text-muted">{vehicle.number}</p>
                  </div>
                </div>
                <Badge variant={vehicle.status === 'Active' ? 'success' : 'default'}>
                  {vehicle.status}
                </Badge>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Type</span>
                  <span className="font-medium text-ink">{vehicle.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Capacity</span>
                  <span className="font-medium text-ink">{vehicle.capacity} kg</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Fuel Type</span>
                  <span className="font-medium text-ink">{vehicle.fuelType}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Last Maintenance</span>
                  <span className="font-medium text-ink">{vehicle.lastMaintenance}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
                <div className="text-center">
                  <p className="text-sm text-muted">Today's Trips</p>
                  <p className="text-lg font-semibold text-ink">{vehicle.todayTrips}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted">Total Trips</p>
                  <p className="text-lg font-semibold text-ink">{vehicle.totalTrips}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-line">
                <button
                  onClick={() => toggleStatus(vehicle.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    vehicle.status === 'Active'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-success text-white hover:bg-success-dark'
                  }`}
                >
                  {vehicle.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => openEditModal(vehicle)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Edit Vehicle"
                >
                  <FiEdit2 className="w-4 h-4 text-muted" />
                </button>
                <button
                  onClick={() => openDeleteModal(vehicle)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                  title="Remove Vehicle"
                >
                  <FiTrash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={vehicles.length === 0 ? "No vehicles added yet" : "No vehicles found"}
          description={vehicles.length === 0 
            ? "Start by adding your first vehicle to the fleet." 
            : "Try adjusting your search criteria."}
          icon={FiTruck}
          action={
            <Button onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}>
              <FiPlus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          }
        />
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Vehicle"
        description="Add a new vehicle to the fleet"
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
            <Button onClick={handleAddVehicle} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vehicle Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Tata Ace 1"
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
              Vehicle Number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              placeholder="e.g., KA-01-AB-1234"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.number ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.number && (
              <p className="mt-1 text-sm text-danger">{formErrors.number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vehicle Type <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              placeholder="e.g., Tata Ace, Mahindra Bolero"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.type ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.type && (
              <p className="mt-1 text-sm text-danger">{formErrors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Capacity (kg) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              placeholder="e.g., 800"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.capacity ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.capacity && (
              <p className="mt-1 text-sm text-danger">{formErrors.capacity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Fuel Type
            </label>
            <select
              name="fuelType"
              value={formData.fuelType}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
            </select>
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
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Vehicle"
        description="Update vehicle information"
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
            <Button onClick={handleEditVehicle} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FiEdit2 className="w-4 h-4 mr-2" />
                  Update Vehicle
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vehicle Name <span className="text-danger">*</span>
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
              Vehicle Number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.number ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.number && (
              <p className="mt-1 text-sm text-danger">{formErrors.number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vehicle Type <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.type ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.type && (
              <p className="mt-1 text-sm text-danger">{formErrors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Capacity (kg) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition ${
                formErrors.capacity ? 'border-danger' : 'border-line'
              }`}
            />
            {formErrors.capacity && (
              <p className="mt-1 text-sm text-danger">{formErrors.capacity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Fuel Type
            </label>
            <select
              name="fuelType"
              value={formData.fuelType}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition"
            >
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
            </select>
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
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Vehicle Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          resetForm();
        }}
        title="Remove Vehicle"
        description={`Are you sure you want to remove ${selectedVehicle?.name}? This action cannot be undone.`}
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
            <Button variant="danger" onClick={handleDeleteVehicle} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <FiTrash2 className="w-4 h-4 mr-2" />
                  Remove Vehicle
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="p-4 bg-danger-soft rounded-lg border border-danger/20">
          <p className="text-sm text-danger">
            <FiTrash2 className="inline w-4 h-4 mr-2" />
            This will permanently remove {selectedVehicle?.name} from the fleet.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Vehicles;