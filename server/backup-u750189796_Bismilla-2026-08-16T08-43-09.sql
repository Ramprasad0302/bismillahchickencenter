-- Backup of u750189796_Bismilla
-- Source host: in-mum-web787.main-hosting.eu
-- Taken: 2026-08-16T08:43:09.443Z

SET FOREIGN_KEY_CHECKS=0;
SET NAMES utf8mb4;
START TRANSACTION;

-- ------------------------------------
-- Table: cash_verifications
-- ------------------------------------
DROP TABLE IF EXISTS `cash_verifications`;
CREATE TABLE `cash_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `driver_id` int(11) NOT NULL,
  `trip_number` varchar(50) NOT NULL,
  `total_cash_collected` decimal(10,2) NOT NULL,
  `diesel_expense` decimal(10,2) DEFAULT 0.00,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT current_timestamp(),
  `verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_driver_id` (`driver_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `cash_verifications_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cash_verifications` (`id`, `driver_id`, `trip_number`, `total_cash_collected`, `diesel_expense`, `status`, `submitted_at`, `verified_at`) VALUES
  (1, 2, 'TRIP-20260806-0001', '5000.00', '0.00', 'verified', '2026-08-06 05:41:34', '2026-08-06 07:31:13'),
  (2, 2, 'TRIP-20260806-0004', '12000.00', '10000.00', 'verified', '2026-08-06 07:42:49', '2026-08-06 07:44:08'),
  (3, 2, 'TRIP-20260806-0005', '10000.00', '9999.00', 'verified', '2026-08-06 07:57:22', '2026-08-06 07:58:22');

-- ------------------------------------
-- Table: drivers
-- ------------------------------------
DROP TABLE IF EXISTS `drivers`;
CREATE TABLE `drivers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `vehicle_number` varchar(20) DEFAULT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `status` enum('available','on_delivery','inactive') DEFAULT 'available',
  `daily_salary` decimal(8,2) DEFAULT 0.00,
  `joined_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_phone` (`phone`),
  CONSTRAINT `drivers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `drivers` (`id`, `user_id`, `name`, `phone`, `vehicle_number`, `vehicle_type`, `license_number`, `status`, `daily_salary`, `joined_date`, `created_at`, `updated_at`) VALUES
  (1, 3, 'Ajith', '6309357023', NULL, NULL, NULL, 'on_delivery', '0.00', '2026-08-04 18:30:00', '2026-08-05 11:01:58', '2026-08-05 11:01:58'),
  (2, 7, 'Ramprasad Driver', '9153226699', NULL, NULL, NULL, 'on_delivery', '0.00', '2026-08-05 18:30:00', '2026-08-06 00:40:55', '2026-08-06 00:41:24');

-- ------------------------------------
-- Table: expenses
-- ------------------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date DEFAULT NULL,
  `recorded_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------
-- Table: ledger
-- ------------------------------------
DROP TABLE IF EXISTS `ledger`;
CREATE TABLE `ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `retailer_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `type` enum('debit','credit') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `date` timestamp NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_retailer_id` (`retailer_id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `ledger_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ledger_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------
-- Table: ledgers
-- ------------------------------------
DROP TABLE IF EXISTS `ledgers`;
CREATE TABLE `ledgers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `retailer_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `type` enum('debit','credit') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `retailer_id` (`retailer_id`),
  CONSTRAINT `ledgers_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ledgers` (`id`, `retailer_id`, `order_id`, `type`, `amount`, `description`, `date`, `created_at`) VALUES
  (1, 3, 9, 'credit', '10000.00', 'Payment via Cash', '2026-08-04 18:30:00', '2026-08-05 08:34:35'),
  (2, 1, 10, 'credit', '6700.00', 'Payment via Cash', '2026-08-04 18:30:00', '2026-08-05 08:47:16'),
  (3, 3, 11, 'credit', '10000.00', 'Payment via Cash', '2026-08-05 18:30:00', '2026-08-06 00:10:50'),
  (4, 3, 9, 'credit', '15000.00', 'Payment via Cash', '2026-08-05 18:30:00', '2026-08-06 11:23:31'),
  (5, 3, 8, 'credit', '40600.00', 'Payment via Cash', '2026-08-05 18:30:00', '2026-08-06 11:29:18'),
  (6, 3, 8, 'credit', '10000.00', 'Payment via Cash', '2026-08-14 18:30:00', '2026-08-15 06:29:59');

-- ------------------------------------
-- Table: orders
-- ------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `retailer_id` int(11) NOT NULL,
  `kg_ordered` decimal(10,2) NOT NULL,
  `kg_delivered` decimal(10,2) DEFAULT 0.00,
  `rate_per_kg` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT 0.00,
  `delivery_charge` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) DEFAULT 0.00,
  `balance` decimal(10,2) DEFAULT 0.00,
  `payment_method` enum('upi','cash','bank_transfer','cheque','online','pending') DEFAULT 'pending',
  `upi_transaction_id` varchar(100) DEFAULT NULL,
  `payment_status` enum('paid','partial','pending') DEFAULT 'pending',
  `order_status` enum('pending','confirmed','processing','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
  `driver_id` int(11) DEFAULT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `order_date` timestamp NULL DEFAULT current_timestamp(),
  `delivered_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_retailer_id` (`retailer_id`),
  KEY `idx_driver_id` (`driver_id`),
  KEY `idx_order_status` (`order_status`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_orders_created_at` (`created_at` DESC),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `orders` (`id`, `order_number`, `retailer_id`, `kg_ordered`, `kg_delivered`, `rate_per_kg`, `subtotal`, `discount`, `delivery_charge`, `total_amount`, `paid_amount`, `balance`, `payment_method`, `upi_transaction_id`, `payment_status`, `order_status`, `driver_id`, `trip_id`, `delivery_address`, `notes`, `order_date`, `delivered_date`, `created_at`, `updated_at`) VALUES
  (1, 'BIS-20260805-0001', 3, '100.00', '0.00', '188.00', '18800.00', '0.00', '0.00', '18800.00', '10000.00', '8800.00', 'cash', NULL, 'pending', 'out_for_delivery', NULL, 2, NULL, NULL, '2026-08-04 18:30:00', NULL, '2026-08-05 03:50:16', '2026-08-06 07:31:13'),
  (2, 'BIS-20260805-0002', 3, '200.00', '0.00', '188.00', '37600.00', '0.00', '0.00', '37600.00', '0.00', '37600.00', 'cash', NULL, 'pending', 'out_for_delivery', NULL, 1, NULL, NULL, '2026-08-04 18:30:00', NULL, '2026-08-05 03:55:49', '2026-08-05 11:01:58'),
  (3, 'BIS-20260805-0003', 3, '100.00', '0.00', '188.00', '18800.00', '0.00', '0.00', '18800.00', '0.00', '18800.00', 'cash', NULL, 'pending', 'out_for_delivery', NULL, 2, NULL, NULL, '2026-08-04 18:30:00', NULL, '2026-08-05 03:57:31', '2026-08-06 00:41:24'),
  (4, 'BIS-20260805-0004', 3, '100.00', '0.00', '188.00', '18800.00', '0.00', '0.00', '18800.00', '0.00', '18800.00', 'upi', NULL, 'pending', 'delivered', NULL, 3, NULL, NULL, '2026-08-04 18:30:00', '2026-08-05 18:30:00', '2026-08-05 03:59:15', '2026-08-06 03:07:21'),
  (5, 'BIS-20260805-0005', 3, '100.00', '0.00', '188.00', '18800.00', '0.00', '0.00', '18800.00', '24000.00', '-5200.00', 'upi', NULL, 'pending', 'delivered', NULL, 5, NULL, NULL, '2026-08-04 18:30:00', '2026-08-05 18:30:00', '2026-08-05 03:59:43', '2026-08-06 07:44:08'),
  (6, 'BIS-20260805-0006', 3, '300.00', '0.00', '188.00', '56400.00', '0.00', '0.00', '56400.00', '20000.00', '36400.00', 'cash', NULL, 'pending', 'delivered', NULL, 6, NULL, NULL, '2026-08-04 18:30:00', '2026-08-05 18:30:00', '2026-08-05 04:01:33', '2026-08-06 07:58:22'),
  (7, 'BIS-20260805-0007', 3, '100.00', '0.00', '188.00', '18800.00', '0.00', '0.00', '18800.00', '0.00', '18800.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-04 18:30:00', NULL, '2026-08-05 04:01:51', '2026-08-05 04:01:51'),
  (8, 'BIS-20260805-0008', 3, '500.00', '0.00', '188.00', '94000.00', '0.00', '0.00', '94000.00', '48000.00', '46000.00', 'cash', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-04 18:30:00', NULL, '2026-08-05 04:05:26', '2026-08-15 06:29:59'),
  (9, 'BIS-20260805-0009', 3, '50.00', '0.00', '188.00', '9400.00', '0.00', '0.00', '9400.00', '9400.00', '0.00', 'cash', NULL, 'pending', 'delivered', NULL, 7, NULL, NULL, '2026-08-04 18:30:00', '2026-08-14 18:30:00', '2026-08-05 04:46:34', '2026-08-15 06:33:50'),
  (10, 'BIS-20260805-0010', 1, '50.00', '0.00', '188.00', '9400.00', '0.00', '0.00', '9400.00', '6700.00', '2700.00', 'cash', NULL, 'pending', 'delivered', NULL, NULL, NULL, NULL, '2026-08-04 18:30:00', '2026-08-05 18:30:00', '2026-08-05 04:54:05', '2026-08-06 02:18:26'),
  (11, 'BIS-20260805-0011', 3, '100.00', '0.00', '188.00', '18800.00', '0.00', '0.00', '18800.00', '18800.00', '0.00', 'cash', NULL, 'pending', 'delivered', NULL, 4, NULL, NULL, '2026-08-04 18:30:00', '2026-08-05 18:30:00', '2026-08-05 14:01:03', '2026-08-06 11:23:31'),
  (12, 'BIS-20260806-0001', 3, '200.00', '0.00', '188.00', '37600.00', '0.00', '0.00', '37600.00', '0.00', '37600.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-05 18:30:00', NULL, '2026-08-06 13:16:21', '2026-08-06 13:16:21'),
  (13, 'BIS-20260815-0001', 3, '300.00', '0.00', '210.00', '63000.00', '0.00', '0.00', '63000.00', '0.00', '63000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-14 18:30:00', NULL, '2026-08-15 06:22:47', '2026-08-15 06:22:47'),
  (14, 'BIS-20260815-0002', 3, '100.00', '0.00', '210.00', '21000.00', '0.00', '0.00', '21000.00', '0.00', '21000.00', 'cash', NULL, 'pending', 'delivered', NULL, 8, NULL, NULL, '2026-08-14 18:30:00', '2026-08-14 18:30:00', '2026-08-15 06:23:28', '2026-08-15 06:34:21'),
  (15, 'BIS-20260815-0003', 3, '100.00', '0.00', '210.00', '21000.00', '0.00', '0.00', '21000.00', '0.00', '21000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-14 18:30:00', NULL, '2026-08-15 06:42:01', '2026-08-15 06:42:01'),
  (16, 'BIS-20260815-0004', 3, '100.00', '0.00', '210.00', '21000.00', '0.00', '0.00', '21000.00', '0.00', '21000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-14 18:30:00', NULL, '2026-08-15 10:01:08', '2026-08-15 10:01:08'),
  (17, 'BIS-20260815-0005', 3, '100.00', '0.00', '210.00', '21000.00', '0.00', '0.00', '21000.00', '0.00', '21000.00', 'cash', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-14 18:30:00', NULL, '2026-08-15 10:02:04', '2026-08-15 10:02:04'),
  (18, 'BIS-20260815-0006', 3, '100.00', '0.00', '210.00', '21000.00', '0.00', '0.00', '21000.00', '0.00', '21000.00', 'cash', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-14 18:30:00', NULL, '2026-08-15 12:42:42', '2026-08-15 12:42:42'),
  (19, 'BIS-20260815-0007', 3, '50.00', '0.00', '210.00', '10500.00', '0.00', '0.00', '10500.00', '0.00', '10500.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-14 18:30:00', NULL, '2026-08-15 13:40:42', '2026-08-15 13:40:42'),
  (20, 'BIS-20260816-0001', 3, '50.00', '0.00', '300.00', '15000.00', '0.00', '0.00', '15000.00', '0.00', '15000.00', 'cash', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 00:00:40', '2026-08-16 00:00:40'),
  (21, 'BIS-20260816-0002', 3, '50.00', '0.00', '300.00', '15000.00', '0.00', '0.00', '15000.00', '0.00', '15000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 00:46:12', '2026-08-16 00:46:12'),
  (22, 'BIS-20260816-0003', 3, '50.00', '0.00', '300.00', '15000.00', '0.00', '0.00', '15000.00', '0.00', '15000.00', 'cash', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 00:48:20', '2026-08-16 00:48:20'),
  (23, 'BIS-20260816-0004', 3, '200.00', '0.00', '300.00', '60000.00', '0.00', '0.00', '60000.00', '0.00', '60000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 01:12:02', '2026-08-16 01:12:02'),
  (24, 'BIS-20260816-0005', 3, '100.00', '0.00', '300.00', '30000.00', '0.00', '0.00', '30000.00', '0.00', '30000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 01:20:24', '2026-08-16 01:20:24'),
  (25, 'BIS-20260816-0006', 3, '50.00', '0.00', '300.00', '15000.00', '0.00', '0.00', '15000.00', '0.00', '15000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 01:41:22', '2026-08-16 01:41:22'),
  (26, 'BIS-20260816-0007', 3, '50.00', '0.00', '300.00', '15000.00', '0.00', '0.00', '15000.00', '0.00', '15000.00', 'upi', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 01:52:20', '2026-08-16 01:52:20'),
  (27, 'BIS-20260816-0008', 3, '50.00', '0.00', '188.00', '9400.00', '0.00', '0.00', '9400.00', '0.00', '9400.00', 'cash', NULL, 'pending', 'pending', NULL, NULL, NULL, NULL, '2026-08-15 18:30:00', NULL, '2026-08-16 02:31:51', '2026-08-16 02:31:51');

-- ------------------------------------
-- Table: payments
-- ------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(20) NOT NULL,
  `retailer_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('cash','upi','bank_transfer','cheque','online') NOT NULL,
  `status` enum('pending','partial','paid','verified') DEFAULT 'pending',
  `collected_by` varchar(50) DEFAULT NULL,
  `collected_by_role` enum('admin','driver') DEFAULT 'admin',
  `date` timestamp NULL DEFAULT current_timestamp(),
  `verified_by` varchar(50) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `idx_payment_number` (`payment_number`),
  KEY `idx_retailer_id` (`retailer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------
-- Table: payment_transactions
-- ------------------------------------
DROP TABLE IF EXISTS `payment_transactions`;
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reference` varchar(40) NOT NULL,
  `retailer_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `provider` varchar(20) NOT NULL,
  `provider_session_id` varchar(255) DEFAULT NULL,
  `provider_payment_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `status` enum('created','pending','success','failed','cancelled') DEFAULT 'created',
  `settled` tinyint(1) DEFAULT 0,
  `payment_id` int(11) DEFAULT NULL,
  `allocations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allocations`)),
  `failure_reason` varchar(255) DEFAULT NULL,
  `raw_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_payload`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  UNIQUE KEY `uniq_provider_payment` (`provider`,`provider_payment_id`),
  KEY `order_id` (`order_id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_reference` (`reference`),
  KEY `idx_retailer` (`retailer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_session` (`provider_session_id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payment_transactions_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payment_transactions` (`id`, `reference`, `retailer_id`, `order_id`, `provider`, `provider_session_id`, `provider_payment_id`, `amount`, `currency`, `status`, `settled`, `payment_id`, `allocations`, `failure_reason`, `raw_payload`, `created_at`, `updated_at`) VALUES
  (1, 'TXN-20260815-0001', 3, NULL, 'stripe', 'cs_test_a1jvCkweIdyaU76d9HXtbxrk4PD8HKw5aIanAwpG2YMxOM1OKIsW1PK4tb', NULL, '10000.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-15 06:42:01', '2026-08-15 06:42:12'),
  (2, 'TXN-20260815-0002', 3, NULL, 'stripe', 'cs_test_a1SLmr6OPUGlO2KAHuYiVTzkEoo2X8Ba9wjpAJqESWLuy0PcLPT0Fg2ofn', NULL, '5000.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-15 10:01:09', '2026-08-15 10:01:11'),
  (3, 'TXN-20260815-0003', 3, NULL, 'stripe', 'cs_test_a1RO54UEgSzlAvqlg5VDjJuC9QHTr5YLFswgjbO7LoHPiipbyfnTSq13Me', NULL, '390800.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-15 12:47:56', '2026-08-15 12:48:06'),
  (4, 'TXN-20260816-0001', 3, NULL, 'stripe', 'cs_test_a1QTVWdFGazvZ5maKyp30wYHxeSIL0By25KrCWlmHJoIeXfnHzdXlKPWKp', NULL, '416300.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-16 00:01:09', '2026-08-16 00:01:10'),
  (5, 'TXN-20260816-0002', 3, 23, 'stripe', 'cs_test_a14G2BxJvKKxVIpjLI79RsIEHPMX5E7k2OsQ8mtpBR54qOV5CtF0sJv9J6', NULL, '60000.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-16 01:12:02', '2026-08-16 01:12:02'),
  (6, 'TXN-20260816-0003', 3, 24, 'stripe', 'cs_test_a1EfhUpW4NnxhWG401attmjLRvrtLAClw2bu9qZr2n1PnQPMajASGDFg8q', NULL, '30000.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-16 01:20:25', '2026-08-16 01:20:25'),
  (7, 'TXN-20260816-0004', 3, 25, 'stripe', 'cs_test_a1w5iDyNVr1TAU7DzmcOSFqn2DG8e26hsIfDez8DGrJjLlXOpBW2M4xIAJ', NULL, '15000.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-16 01:41:23', '2026-08-16 01:41:23'),
  (8, 'TXN-20260816-0005', 3, 26, 'stripe', 'cs_test_a13QkBK9d1eoMHQ0Vw8YoMUZFeD5VOu4wrfGK1cuMUb2x8nTGEyS6U6LGf', NULL, '15000.00', 'INR', 'pending', 0, NULL, NULL, NULL, NULL, '2026-08-16 01:52:20', '2026-08-16 01:52:20');

-- ------------------------------------
-- Table: pricing
-- ------------------------------------
DROP TABLE IF EXISTS `pricing`;
CREATE TABLE `pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `default_price_per_kg` decimal(10,2) NOT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pricing` (`id`, `default_price_per_kg`, `updated_by`, `updated_at`) VALUES
  (1, '188.00', 'System', '2026-07-26 11:35:34'),
  (2, '188.00', 'System', '2026-07-28 08:40:27'),
  (3, '188.00', 'System', '2026-08-05 03:40:13'),
  (4, '198.00', 'Mohammed Admin', '2026-08-05 23:35:21'),
  (5, '188.00', 'Mohammed Admin', '2026-08-16 02:30:10');

-- ------------------------------------
-- Table: retailers
-- ------------------------------------
DROP TABLE IF EXISTS `retailers`;
CREATE TABLE `retailers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `shop_name` varchar(100) NOT NULL,
  `owner_name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `area` varchar(50) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `credit_limit` decimal(10,2) DEFAULT 0.00,
  `outstanding` decimal(10,2) DEFAULT 0.00,
  `status` enum('active','inactive') DEFAULT 'active',
  `joined_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_phone` (`phone`),
  CONSTRAINT `retailers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `retailers` (`id`, `user_id`, `shop_name`, `owner_name`, `phone`, `email`, `address`, `area`, `city`, `pincode`, `credit_limit`, `outstanding`, `status`, `joined_date`, `created_at`, `updated_at`) VALUES
  (1, 4, 'Ram Chicken Shop', 'Ram', '6309357022', 'syamalaajith11@gmail.com', 'Your Shop Address', 'Your Area', 'Your City', 'Your Pinco', '50000.00', '2700.00', 'active', '2026-08-04 18:30:00', '2026-08-04 21:30:28', '2026-08-05 08:47:16'),
  (3, 5, 'Gopi\'s Shop', 'Gopi', '7777777777', 'gopi@gmail.com', NULL, NULL, NULL, NULL, '50000.00', '570500.00', 'active', '2026-08-04 18:30:00', '2026-08-04 22:17:39', '2026-08-16 02:31:51');

-- ------------------------------------
-- Table: retailer_pricing
-- ------------------------------------
DROP TABLE IF EXISTS `retailer_pricing`;
CREATE TABLE `retailer_pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `retailer_id` int(11) NOT NULL,
  `custom_price_per_kg` decimal(10,2) NOT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_retailer_id` (`retailer_id`),
  CONSTRAINT `retailer_pricing_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `retailer_pricing` (`id`, `retailer_id`, `custom_price_per_kg`, `updated_by`, `updated_at`) VALUES
  (3, 1, '210.00', 'Mohammed Admin', '2026-08-15 23:58:11');

-- ------------------------------------
-- Table: staff
-- ------------------------------------
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `role` enum('driver','cleaner') NOT NULL,
  `daily_salary` decimal(10,2) NOT NULL,
  `status` enum('active','inactive','on_leave') DEFAULT 'active',
  `join_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_phone` (`phone`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `staff` (`id`, `name`, `phone`, `role`, `daily_salary`, `status`, `join_date`, `created_at`, `updated_at`) VALUES
  (1, 'Ajith', '9876543210', 'driver', '500.00', 'active', '2026-07-27 18:30:00', '2026-07-28 04:43:21', '2026-07-28 04:43:21'),
  (2, 'Ram', '8765432109', 'cleaner', '500.00', 'active', '2026-08-04 18:30:00', '2026-08-05 10:50:21', '2026-08-05 10:50:21');

-- ------------------------------------
-- Table: staff_trips
-- ------------------------------------
DROP TABLE IF EXISTS `staff_trips`;
CREATE TABLE `staff_trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  `role` enum('driver','cleaner') NOT NULL,
  `date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_staff_id` (`staff_id`),
  KEY `idx_trip_id` (`trip_id`),
  CONSTRAINT `staff_trips_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `staff_trips_ibfk_2` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `staff_trips` (`id`, `staff_id`, `trip_id`, `role`, `date`, `created_at`) VALUES
  (1, 1, 1, 'cleaner', '2026-08-04 18:30:00', '2026-08-05 11:01:58'),
  (2, 1, 2, 'cleaner', '2026-08-05 18:30:00', '2026-08-06 00:41:24'),
  (3, 1, 3, 'cleaner', '2026-08-05 18:30:00', '2026-08-06 00:58:49'),
  (4, 1, 4, 'cleaner', '2026-08-05 18:30:00', '2026-08-06 05:25:02');

-- ------------------------------------
-- Table: trips
-- ------------------------------------
DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_number` varchar(20) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `total_hens` int(11) DEFAULT 0,
  `total_kg` decimal(10,2) DEFAULT 0.00,
  `diesel_amount` decimal(10,2) DEFAULT 0.00,
  `diesel_photo` varchar(255) DEFAULT NULL,
  `status` enum('assigned','in_progress','completed') DEFAULT 'assigned',
  `date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_number` (`trip_number`),
  KEY `idx_driver_id` (`driver_id`),
  KEY `idx_trip_number` (`trip_number`),
  CONSTRAINT `trips_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `trips` (`id`, `trip_number`, `driver_id`, `total_hens`, `total_kg`, `diesel_amount`, `diesel_photo`, `status`, `date`, `created_at`, `updated_at`) VALUES
  (1, 'TRIP-20260805-0001', 1, 0, '200.00', '0.00', NULL, 'assigned', '2026-08-04 18:30:00', '2026-08-05 11:01:58', '2026-08-05 11:01:58'),
  (2, 'TRIP-20260806-0001', 2, 500, '200.00', '12000.00', NULL, 'completed', '2026-08-05 18:30:00', '2026-08-06 00:41:24', '2026-08-06 00:55:26'),
  (3, 'TRIP-20260806-0002', 2, 200, '100.00', '12000.00', NULL, 'completed', '2026-08-05 18:30:00', '2026-08-06 00:58:49', '2026-08-06 03:07:21'),
  (4, 'TRIP-20260806-0003', 2, 1000, '100.00', '20000.00', NULL, 'completed', '2026-08-05 18:30:00', '2026-08-06 05:25:02', '2026-08-06 05:26:30'),
  (5, 'TRIP-20260806-0004', 2, 1200, '100.00', '10000.00', NULL, 'completed', '2026-08-05 18:30:00', '2026-08-06 07:41:39', '2026-08-06 07:42:49'),
  (6, 'TRIP-20260806-0005', 2, 1500, '300.00', '9999.00', NULL, 'completed', '2026-08-05 18:30:00', '2026-08-06 07:56:44', '2026-08-06 07:57:22'),
  (7, 'TRIP-20260815-0001', 2, 1200, '50.00', '21000.00', NULL, 'completed', '2026-08-14 18:30:00', '2026-08-15 06:24:51', '2026-08-15 06:33:50'),
  (8, 'TRIP-20260815-0002', 2, 1200, '100.00', '11987.00', NULL, 'completed', '2026-08-14 18:30:00', '2026-08-15 06:31:28', '2026-08-15 06:34:20');

-- ------------------------------------
-- Table: trip_orders
-- ------------------------------------
DROP TABLE IF EXISTS `trip_orders`;
CREATE TABLE `trip_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `actual_delivered_kg` decimal(10,2) DEFAULT 0.00,
  `cash_collected` decimal(10,2) DEFAULT 0.00,
  `delivered_status` enum('pending','delivered') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_trip_id` (`trip_id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `trip_orders_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trip_orders_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `trip_orders` (`id`, `trip_id`, `order_id`, `actual_delivered_kg`, `cash_collected`, `delivered_status`, `created_at`, `updated_at`) VALUES
  (1, 1, 2, '0.00', '0.00', 'pending', '2026-08-05 11:01:58', '2026-08-05 11:01:58'),
  (2, 2, 1, '120.00', '5000.00', 'delivered', '2026-08-06 00:41:24', '2026-08-06 00:55:26'),
  (3, 2, 3, '90.00', '0.00', 'delivered', '2026-08-06 00:41:24', '2026-08-06 00:55:26'),
  (4, 3, 4, '100.00', '0.00', 'delivered', '2026-08-06 00:58:49', '2026-08-06 03:07:21'),
  (5, 4, 11, '100.00', '0.00', 'delivered', '2026-08-06 05:25:02', '2026-08-06 05:26:30'),
  (6, 5, 5, '100.00', '12000.00', 'delivered', '2026-08-06 07:41:39', '2026-08-06 07:42:49'),
  (7, 6, 6, '300.00', '10000.00', 'delivered', '2026-08-06 07:56:44', '2026-08-06 07:57:22'),
  (8, 7, 9, '50.00', '0.00', 'delivered', '2026-08-15 06:24:51', '2026-08-15 06:33:50'),
  (9, 8, 14, '100.00', '0.00', 'delivered', '2026-08-15 06:31:28', '2026-08-15 06:34:21');

-- ------------------------------------
-- Table: users
-- ------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','retailer','driver') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_phone` (`phone`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `phone`, `email`, `password`, `role`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
  (1, 'Mohammed Admin', '9999999999', NULL, '$2b$10$ci4il.rPzLxFoLuvAGz0BetEjTwwGbLNOrvSpSwfIbhrYnmgpxHfu', 'admin', 'active', '2026-08-16 02:31:11', '2026-07-26 11:35:34', '2026-08-16 02:31:11'),
  (3, 'Ajith', '6309357023', 'aspam1441@gmail.com', '$2b$10$3H9vNBVb3SxG.KjTdOvW6OthpCBn3zlb5RkjJWk0Icl8KNqESWQ0i', 'driver', 'active', '2026-08-13 12:54:46', '2026-07-28 11:17:02', '2026-08-13 12:54:46'),
  (4, 'Ram', '6309357022', 'syamalaajith11@gmail.com', '$2b$10$0AXwms5TGFMxyzL6IaOfX..fVBgq5RTmvFBW458tztb8cy.qD7Hxa', 'retailer', 'active', '2026-08-16 01:46:07', '2026-07-29 10:43:20', '2026-08-16 01:46:07'),
  (5, 'Gopi', '7777777777', 'gopi@gmail.com', '$2b$10$/g0w6gm.2IMHRBATi7hjZO8YW.NBiUCY16MhI2MZlpt3slKqV0RPq', 'retailer', 'active', '2026-08-16 02:31:39', '2026-08-04 22:17:39', '2026-08-16 02:31:39'),
  (7, 'Ramprasad Driver', '9153226699', 'gopidurgashanmukha111@gmail.com', '$2b$10$.jwA4KG7ejse6Upd7zlCKOXLBXWyNIc5M.qqhf8nxhjiM54K77Uee', 'driver', 'active', '2026-08-15 06:33:15', '2026-08-06 00:40:55', '2026-08-15 06:33:15');

-- ------------------------------------
-- Table: vehicles
-- ------------------------------------
DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(20) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `number` varchar(30) NOT NULL,
  `type` varchar(100) NOT NULL,
  `capacity` int(11) NOT NULL,
  `fuel_type` enum('Diesel','Petrol','CNG','Electric') DEFAULT 'Diesel',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `today_trips` int(11) DEFAULT 0,
  `total_trips` int(11) DEFAULT 0,
  `last_maintenance` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `number` (`number`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vehicles` (`id`, `vehicle_id`, `name`, `number`, `type`, `capacity`, `fuel_type`, `status`, `today_trips`, `total_trips`, `last_maintenance`, `created_at`, `updated_at`) VALUES
  (1, NULL, 'Ashok Leyland Dost', 'AP39AA1111', 'Ashok Leyland Dost', 1498, 'Diesel', 'Active', 8, 8, NULL, '2026-07-28 09:09:48', '2026-08-15 06:31:28');

COMMIT;
SET FOREIGN_KEY_CHECKS=1;
