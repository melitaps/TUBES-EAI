-- ============================================
-- POS Service Database Schema (MySQL)
-- ============================================

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(50),
  total_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(200),
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Seed Data
INSERT INTO sales (invoice_no, customer_id, total_amount, status) VALUES
('INV-20240101-001', 'CUST001', 250000.00, 'completed'),
('INV-20240101-002', 'CUST002', 175000.00, 'completed'),
('INV-20240102-001', 'CUST003', 520000.00, 'completed'),
('INV-20240102-002', 'CUST001', 89000.00, 'completed'),
('INV-20240103-001', 'CUST004', 340000.00, 'completed');

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
(1, 'PROD001', 'Laptop ASUS VivoBook', 1, 250000.00, 250000.00),
(2, 'PROD002', 'Mouse Logitech M331', 2, 45000.00, 90000.00),
(2, 'PROD003', 'Keyboard Mechanical', 1, 85000.00, 85000.00),
(3, 'PROD004', 'Monitor Samsung 24"', 2, 260000.00, 520000.00),
(4, 'PROD005', 'USB Hub 4 Port', 1, 89000.00, 89000.00),
(5, 'PROD001', 'Laptop ASUS VivoBook', 1, 250000.00, 250000.00),
(5, 'PROD003', 'Keyboard Mechanical', 1, 90000.00, 90000.00);
