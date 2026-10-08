// Dashboard Stats
export const mockStats = {
  todayOrders: 0,
  todayRevenue: 0,
  kgOrdered: 0,
  kgDelivered: 0,
  activeCustomers: 5,
  cashCollection: 0,
  upiCollection: 0,
  outstanding: 550000,
  pendingDeliveries: 3,
  completedDeliveries: 0,
  totalHens: 0,
  totalTrays: 0,
};

// Weekly Revenue Data
export const weeklyRevenueData = [
  { day: 'Sun', amount: 0 },
  { day: 'Mon', amount: 0 },
  { day: 'Tue', amount: 0 },
  { day: 'Wed', amount: 0 },
  { day: 'Thu', amount: 0 },
  { day: 'Fri', amount: 0 },
  { day: 'Sat', amount: 0 },
];

// Payment Method Breakdown
export const paymentBreakdown = {
  upiCash: 0,
  store: 0,
  credit: 0,
};

// Recent Orders
export const mockRecentOrders = [
  {
    id: 'ORD-1042',
    retailer: 'Al Madina Chicken Shop',
    retailerPhone: '9876543210',
    quantity: '120 kg',
    amount: 24600,
    paymentStatus: 'Partial',
    orderStatus: 'Out for Delivery',
    date: '24 Jul 2026',
    driver: 'Sameer Khan',
    items: [
      { name: 'Whole Chicken', quantity: 70, rate: 210, total: 14700 },
      { name: 'Chicken Breast', quantity: 50, rate: 198, total: 9900 },
    ],
  },
  {
    id: 'ORD-1041',
    retailer: 'Hyderabad Poultry',
    retailerPhone: '9876543211',
    quantity: '85 kg',
    amount: 17425,
    paymentStatus: 'Paid',
    orderStatus: 'Delivered',
    date: '24 Jul 2026',
    driver: 'Rahul Singh',
    items: [
      { name: 'Whole Chicken', quantity: 60, rate: 210, total: 12600 },
      { name: 'Chicken Legs', quantity: 25, rate: 193, total: 4825 },
    ],
  },
  {
    id: 'ORD-1040',
    retailer: 'City Chicken Store',
    retailerPhone: '9876543212',
    quantity: '150 kg',
    amount: 30750,
    paymentStatus: 'Pending',
    orderStatus: 'Pending',
    date: '23 Jul 2026',
    driver: 'Unassigned',
    items: [
      { name: 'Whole Chicken', quantity: 100, rate: 205, total: 20500 },
      { name: 'Chicken Wings', quantity: 50, rate: 205, total: 10250 },
    ],
  },
  {
    id: 'ORD-1039',
    retailer: 'Fresh Meat Shop',
    retailerPhone: '9876543213',
    quantity: '65 kg',
    amount: 13325,
    paymentStatus: 'Partial',
    orderStatus: 'Processing',
    date: '23 Jul 2026',
    driver: 'Unassigned',
    items: [
      { name: 'Skinless Chicken', quantity: 45, rate: 235, total: 10575 },
      { name: 'Chicken Breast', quantity: 20, rate: 137.5, total: 2750 },
    ],
  },
];

// Retailers
export const mockRetailers = [
  {
    id: 'RET-001',
    name: 'Sharma Chicken Corner',
    ownerName: 'Rahul Sharma',
    shop: 'Sharma Chicken Corner',
    phone: '9876543210',
    email: 'rahul@sharmachicken.com',
    address: '12 Market Road, Hyderabad',
    area: 'Charminar',
    city: 'Hyderabad',
    pincode: '500001',
    creditLimit: 200000,
    outstanding: 130000,
    orders: 45,
    totalPurchase: 1250000,
    totalPayment: 1120000,
    status: 'Active',
    joined: '15 Jan 2024',
  },
  {
    id: 'RET-002',
    name: 'Khan Poultry',
    ownerName: 'Suresh Khan',
    shop: 'Khan Poultry',
    phone: '9876543211',
    email: 'suresh@khanpoultry.com',
    address: '45 Main Street, Secunderabad',
    area: 'Secunderabad',
    city: 'Hyderabad',
    pincode: '500003',
    creditLimit: 150000,
    outstanding: 35000,
    orders: 32,
    totalPurchase: 850000,
    totalPayment: 815000,
    status: 'Active',
    joined: '22 Mar 2024',
  },
  {
    id: 'RET-003',
    name: 'Reddy Fresh Meats',
    ownerName: 'Mohan Reddy',
    shop: 'Reddy Fresh Meats',
    phone: '9876543212',
    email: 'mohan@reddymeats.com',
    address: 'Plot 8, Industrial Area, Hyderabad',
    area: 'Industrial Area',
    city: 'Hyderabad',
    pincode: '500032',
    creditLimit: 300000,
    outstanding: 210000,
    orders: 68,
    totalPurchase: 2100000,
    totalPayment: 1890000,
    status: 'Active',
    joined: '10 Jun 2024',
  },
  {
    id: 'RET-004',
    name: 'Patel Chicken',
    ownerName: 'Priya Patel',
    shop: 'Patel Chicken',
    phone: '9876543213',
    email: 'priya@patelchicken.com',
    address: '234 Jubilee Hills',
    area: 'Jubilee Hills',
    city: 'Hyderabad',
    pincode: '500033',
    creditLimit: 100000,
    outstanding: 0,
    orders: 18,
    totalPurchase: 420000,
    totalPayment: 420000,
    status: 'Active',
    joined: '05 Sep 2024',
  },
  {
    id: 'RET-005',
    name: 'Gupta Poultry House',
    ownerName: 'Ravi Gupta',
    shop: 'Gupta Poultry House',
    phone: '9876543214',
    email: 'ravi@guptapoultry.com',
    address: '56 Banjara Hills',
    area: 'Banjara Hills',
    city: 'Hyderabad',
    pincode: '500034',
    creditLimit: 250000,
    outstanding: 175000,
    orders: 52,
    totalPurchase: 1560000,
    totalPayment: 1385000,
    status: 'Active',
    joined: '20 Oct 2024',
  },
];

// Drivers
export const mockDrivers = [
  {
    id: 'DRV-001',
    name: 'Sameer Khan',
    phone: '9876543220',
    vehicleNumber: 'KA-01-AB-1234',
    vehicleType: 'Mahindra Bolero',
    licenseNumber: 'DL-2024-1234',
    status: 'Available',
    deliveriesToday: 5,
    completed: 4,
    pending: 1,
    joined: '01 Jan 2024',
  },
  {
    id: 'DRV-002',
    name: 'Salim Ahmed',
    phone: '9876543221',
    vehicleNumber: 'KA-01-CD-5678',
    vehicleType: 'Tata Ace',
    licenseNumber: 'DL-2024-5678',
    status: 'On Delivery',
    deliveriesToday: 6,
    completed: 3,
    pending: 3,
    joined: '15 Feb 2024',
  },
  {
    id: 'DRV-003',
    name: 'Ganesh Rao',
    phone: '9876543222',
    vehicleNumber: 'KA-01-EF-9012',
    vehicleType: 'Ashok Leyland Dost',
    licenseNumber: 'DL-2024-9012',
    status: 'Inactive',
    deliveriesToday: 0,
    completed: 0,
    pending: 0,
    joined: '10 Mar 2024',
  },
  {
    id: 'DRV-004',
    name: 'Prakash Reddy',
    phone: '9876543223',
    vehicleNumber: 'KA-01-GH-3456',
    vehicleType: 'Mahindra Bolero',
    licenseNumber: 'DL-2024-3456',
    status: 'Available',
    deliveriesToday: 0,
    completed: 0,
    pending: 0,
    joined: '05 Apr 2024',
  },
];

// Staff (Drivers and Cleaners)
export const mockStaff = [
  {
    id: 'STF-001',
    name: 'Ramesh Kumar',
    phone: '9876543220',
    role: 'Driver',
    vehicle: 'KA-01-AB-1234',
    dailySalary: 500,
    status: 'Active',
    joinDate: '01 Jan 2024',
    totalTrips: 45,
    tripsThisMonth: 12,
    salaryThisMonth: 6000,
    trips: [
      { date: '25 Jul 2026', tripId: 'TRIP-001', role: 'Driver', status: 'Completed' },
      { date: '24 Jul 2026', tripId: 'TRIP-002', role: 'Driver', status: 'Completed' },
    ],
  },
  {
    id: 'STF-002',
    name: 'Salim Ahmed',
    phone: '9876543221',
    role: 'Driver',
    vehicle: 'KA-01-CD-5678',
    dailySalary: 500,
    status: 'Active',
    joinDate: '15 Feb 2024',
    totalTrips: 32,
    tripsThisMonth: 8,
    salaryThisMonth: 4000,
    trips: [
      { date: '25 Jul 2026', tripId: 'TRIP-001', role: 'Driver', status: 'Completed' },
    ],
  },
  {
    id: 'STF-003',
    name: 'Suresh',
    phone: '9876543230',
    role: 'Cleaner',
    vehicle: '-',
    dailySalary: 300,
    status: 'Active',
    joinDate: '10 Mar 2024',
    totalTrips: 28,
    tripsThisMonth: 10,
    salaryThisMonth: 3000,
    trips: [
      { date: '25 Jul 2026', tripId: 'TRIP-001', role: 'Cleaner', status: 'Completed' },
    ],
  },
  {
    id: 'STF-004',
    name: 'Ravi',
    phone: '9876543231',
    role: 'Cleaner',
    vehicle: '-',
    dailySalary: 300,
    status: 'Active',
    joinDate: '05 Apr 2024',
    totalTrips: 20,
    tripsThisMonth: 5,
    salaryThisMonth: 1500,
    trips: [
      { date: '25 Jul 2026', tripId: 'TRIP-001', role: 'Cleaner', status: 'Completed' },
    ],
  },
];

// Driver Trips
export const mockDriverTrips = [
  {
    id: 'TRIP-001',
    date: '24 Jul 2026',
    status: 'assigned',
    cleaner: ['Suresh', 'Ravi'],
    orders: [
      {
        id: 'ORD-1001',
        retailer: 'Sharma Chicken Corner',
        address: '12 Market Road, Hyderabad',
        phone: '9876543210',
        kg: 150,
        amount: 28200,
        status: 'pending',
        paymentStatus: 'Partial',
      },
      {
        id: 'ORD-1005',
        retailer: 'Khan Poultry',
        address: '45 Main Street, Secunderabad',
        phone: '9876543211',
        kg: 220,
        amount: 41360,
        status: 'pending',
        paymentStatus: 'Pending',
      },
    ],
    totalKg: 370,
    totalOrders: 2,
  },
  {
    id: 'TRIP-002',
    date: '24 Jul 2026',
    status: 'in_progress',
    cleaner: ['Suresh'],
    orders: [
      {
        id: 'ORD-1002',
        retailer: 'Reddy Fresh Meats',
        address: 'Plot 8, Industrial Area, Hyderabad',
        phone: '9876543212',
        kg: 180,
        amount: 33840,
        status: 'in_progress',
        paymentStatus: 'Pending',
      },
    ],
    totalKg: 180,
    totalOrders: 1,
  },
];

// Products
export const mockProducts = [
  { id: 'PROD-001', name: 'Whole Chicken', sku: 'WC-001', unit: 'kg', purchasePrice: 180, sellingPrice: 210, stock: 500, minimumStock: 100, status: 'In Stock' },
  { id: 'PROD-002', name: 'Skinless Chicken', sku: 'SC-001', unit: 'kg', purchasePrice: 200, sellingPrice: 240, stock: 300, minimumStock: 80, status: 'In Stock' },
  { id: 'PROD-003', name: 'Chicken Breast', sku: 'CB-001', unit: 'kg', purchasePrice: 235, sellingPrice: 280, stock: 200, minimumStock: 50, status: 'In Stock' },
  { id: 'PROD-004', name: 'Chicken Legs', sku: 'CL-001', unit: 'kg', purchasePrice: 165, sellingPrice: 195, stock: 150, minimumStock: 100, status: 'Low Stock' },
  { id: 'PROD-005', name: 'Chicken Wings', sku: 'CW-001', unit: 'kg', purchasePrice: 145, sellingPrice: 175, stock: 80, minimumStock: 50, status: 'Low Stock' },
  { id: 'PROD-006', name: 'Boneless Chicken', sku: 'BC-001', unit: 'kg', purchasePrice: 260, sellingPrice: 310, stock: 120, minimumStock: 30, status: 'In Stock' },
  { id: 'PROD-007', name: 'Live Chicken', sku: 'LC-001', unit: 'piece', purchasePrice: 180, sellingPrice: 220, stock: 200, minimumStock: 50, status: 'In Stock' },
];

// Payments
export const mockPayments = [
  { id: 'PAY-001', retailer: 'Al Madina Chicken Shop', order: 'ORD-1042', amount: 10000, method: 'Cash', status: 'Partial', date: '24 Jul 2026', collectedBy: 'Admin' },
  { id: 'PAY-002', retailer: 'Hyderabad Poultry', order: 'ORD-1041', amount: 17425, method: 'UPI', status: 'Paid', date: '24 Jul 2026', collectedBy: 'Admin' },
  { id: 'PAY-003', retailer: 'Fresh Meat Shop', order: 'ORD-1039', amount: 5000, method: 'Bank Transfer', status: 'Partial', date: '23 Jul 2026', collectedBy: 'Admin' },
  { id: 'PAY-004', retailer: 'City Chicken Store', order: 'ORD-1040', amount: 0, method: 'Cash', status: 'Pending', date: '23 Jul 2026', collectedBy: 'Pending' },
  { id: 'PAY-005', retailer: 'Lakshmi Poultry', order: 'ORD-1038', amount: 12500, method: 'UPI', status: 'Paid', date: '22 Jul 2026', collectedBy: 'Admin' },
];

// Driver Collections (Cash collected by drivers)
export const mockDriverCollections = [
  {
    id: 'COL-001',
    orderId: 'ORD-1001',
    retailer: 'Sharma Chicken Corner',
    amount: 15000,
    method: 'Cash',
    date: '24 Jul 2026',
    status: 'Pending Verification',
    tripId: 'TRIP-001',
  },
  {
    id: 'COL-002',
    orderId: 'ORD-1002',
    retailer: 'Reddy Fresh Meats',
    amount: 33840,
    method: 'Cash',
    date: '23 Jul 2026',
    status: 'Verified',
    tripId: 'TRIP-002',
  },
  {
    id: 'COL-003',
    orderId: 'ORD-1005',
    retailer: 'Khan Poultry',
    amount: 41360,
    method: 'UPI',
    date: '24 Jul 2026',
    status: 'Pending Verification',
    tripId: 'TRIP-001',
  },
];

// Driver History
export const mockDriverHistory = [
  {
    id: 'TRIP-002',
    date: '23 Jul 2026',
    orders: 1,
    totalKg: 180,
    totalAmount: 33840,
    status: 'Completed',
    cashCollected: 33840,
    expenses: {
      diesel: 1500,
      hens: 360,
    },
  },
  {
    id: 'TRIP-003',
    date: '22 Jul 2026',
    orders: 2,
    totalKg: 320,
    totalAmount: 60160,
    status: 'Completed',
    cashCollected: 50000,
    expenses: {
      diesel: 2000,
      hens: 640,
    },
  },
  {
    id: 'TRIP-004',
    date: '21 Jul 2026',
    orders: 1,
    totalKg: 150,
    totalAmount: 28200,
    status: 'Completed',
    cashCollected: 28200,
    expenses: {
      diesel: 1200,
      hens: 300,
    },
  },
];

// Retailer Orders (for retailer dashboard)
export const mockRetailerOrders = [
  {
    id: 'ORD-1001',
    date: '24/7/2026',
    kg: 220,
    amount: 42680,
    status: 'En route',
    payment: 'Partial',
    items: 3,
  },
  {
    id: 'ORD-1005',
    date: '23/7/2026',
    kg: 180,
    amount: 34200,
    status: 'Delivered',
    payment: 'Paid',
    items: 2,
  },
  {
    id: 'ORD-1002',
    date: '22/7/2026',
    kg: 150,
    amount: 28200,
    status: 'Delivered',
    payment: 'Paid',
    items: 2,
  },
];

// Expenses
export const mockExpenses = [
  { id: 'EXP-001', category: 'Fuel', description: 'Diesel for delivery vehicles', amount: 5000, date: '24 Jul 2026', recordedBy: 'Admin' },
  { id: 'EXP-002', category: 'Vehicle', description: 'Truck maintenance', amount: 3500, date: '23 Jul 2026', recordedBy: 'Admin' },
  { id: 'EXP-003', category: 'Purchase', description: 'Chicken purchase from farm', amount: 120000, date: '22 Jul 2026', recordedBy: 'Admin' },
  { id: 'EXP-004', category: 'Staff', description: 'Staff salary - July week 3', amount: 15000, date: '22 Jul 2026', recordedBy: 'Admin' },
  { id: 'EXP-005', category: 'Electricity', description: 'Monthly electricity bill', amount: 2800, date: '21 Jul 2026', recordedBy: 'Admin' },
  { id: 'EXP-006', category: 'Maintenance', description: 'Freezer repair', amount: 4500, date: '20 Jul 2026', recordedBy: 'Admin' },
];

// Vehicles
export const mockVehicles = [
  { id: 'VEH-001', name: 'Tata Ace 1', number: 'KA-01-AB-1234', type: 'Tata Ace', capacity: 800, status: 'Active', todayTrips: 2, totalTrips: 45, lastMaintenance: '15 Jul 2026', fuelType: 'Diesel' },
  { id: 'VEH-002', name: 'Mahindra Bolero', number: 'KA-01-CD-5678', type: 'Mahindra Bolero', capacity: 1200, status: 'Active', todayTrips: 3, totalTrips: 78, lastMaintenance: '20 Jul 2026', fuelType: 'Diesel' },
  { id: 'VEH-003', name: 'Ashok Leyland Dost', number: 'KA-01-EF-9012', type: 'Ashok Leyland Dost', capacity: 1500, status: 'Active', todayTrips: 1, totalTrips: 32, lastMaintenance: '10 Jul 2026', fuelType: 'Diesel' },
  { id: 'VEH-004', name: 'Mahindra Bolero 2', number: 'KA-01-GH-3456', type: 'Mahindra Bolero', capacity: 1200, status: 'Inactive', todayTrips: 0, totalTrips: 12, lastMaintenance: '05 Jul 2026', fuelType: 'Diesel' },
];

// Daily Deliveries (for the deliveries section)
export const mockDeliveries = [
  {
    id: 'DEL-001',
    orderId: 'ORD-1042',
    retailer: 'Al Madina Chicken Shop',
    address: '12 Market Road, Hyderabad',
    phone: '9876543210',
    status: 'Out for Delivery',
    driver: 'Sameer Khan',
    weight: '120 kg',
    amount: 24600,
    paymentStatus: 'Partial',
    amountToCollect: 14600,
    scheduledTime: '10:00 AM',
  },
  {
    id: 'DEL-002',
    orderId: 'ORD-1041',
    retailer: 'Hyderabad Poultry',
    address: '45 Main Street, Secunderabad',
    phone: '9876543211',
    status: 'Delivered',
    driver: 'Rahul Singh',
    weight: '85 kg',
    amount: 17425,
    paymentStatus: 'Paid',
    amountToCollect: 0,
    scheduledTime: '09:30 AM',
  },
  {
    id: 'DEL-003',
    orderId: 'ORD-1040',
    retailer: 'City Chicken Store',
    address: '78 IT Park, Gachibowli',
    phone: '9876543212',
    status: 'Pending',
    driver: 'Unassigned',
    weight: '150 kg',
    amount: 30750,
    paymentStatus: 'Pending',
    amountToCollect: 30750,
    scheduledTime: '02:00 PM',
  },
];

// Retailer Mock Data (for retailer dashboard)
export const mockRetailerData = {
  id: 'RET-001',
  name: 'Rahul',
  shop: 'Sharma Chicken Corner',
  phone: '9876543210',
  email: 'rahul@sharmachicken.com',
  address: '12 Market Road, Hyderabad',
  area: 'Charminar',
  city: 'Hyderabad',
  pincode: '500001',
  outstanding: 130000,
  availableCredit: 70000,
  creditLimit: 200000,
  pricePerKg: 188,
  currentOrder: {
    id: 'ORD-1001',
    kg: 220,
    amount: 42680,
    status: 'En route',
  },
  lastOrder: {
    kg: 220,
    amount: 42680,
    date: '24/7/2026',
  },
  lastPayment: {
    amount: 70000,
    method: 'UPI',
    date: '23/7/2026',
  },
};

// Daily Summary Data (for the dashboard)
export const mockDailySummary = {
  date: '25 Jul 2026',
  totalOrders: 0,
  totalRevenue: 0,
  totalKgOrdered: 0,
  totalKgDelivered: 0,
  activeCustomers: 5,
  cashCollection: 0,
  upiCollection: 0,
  outstanding: 550000,
  pendingDeliveries: 3,
  completedDeliveries: 0,
  totalHens: 0,
  totalTrays: 0,
  weeklyRevenue: [
    { day: 'Sun', amount: 0 },
    { day: 'Mon', amount: 0 },
    { day: 'Tue', amount: 0 },
    { day: 'Wed', amount: 0 },
    { day: 'Thu', amount: 0 },
    { day: 'Fri', amount: 0 },
    { day: 'Sat', amount: 0 },
  ],
  paymentBreakdown: {
    upiCash: 0,
    store: 0,
    credit: 0,
  },
};

// Helper function to get status color
export const getStatusColor = (status) => {
  const colors = {
    'Delivered': 'success',
    'Out for Delivery': 'info',
    'En route': 'info',
    'Processing': 'primary',
    'Pending': 'warning',
    'Cancelled': 'danger',
    'Paid': 'success',
    'Partial': 'warning',
    'In Stock': 'success',
    'Low Stock': 'danger',
    'Active': 'success',
    'Inactive': 'default',
    'Available': 'success',
    'On Delivery': 'info',
    'Assigned': 'info',
    'In Progress': 'info',
    'Completed': 'success',
    'Verified': 'success',
    'Pending Verification': 'warning',
  };
  return colors[status] || 'default';
};

// Helper function to format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Helper function to format date with time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};