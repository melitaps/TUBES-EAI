-- ============================================
-- CRM Service Database Schema (MySQL)
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  event_id VARCHAR(100) UNIQUE,
  product_id VARCHAR(50),
  product_name VARCHAR(200),
  quantity INT,
  total_amount DECIMAL(12,2),
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Seed Data
INSERT INTO customers (id, name, email, phone, address) VALUES
('CUST001', 'Budi Santoso', 'budi@email.com', '081234567890', 'Jl. Merdeka No. 1, Jakarta'),
('CUST002', 'Siti Rahayu', 'siti@email.com', '082345678901', 'Jl. Sudirman No. 25, Bandung'),
('CUST003', 'Ahmad Hidayat', 'ahmad@email.com', '083456789012', 'Jl. Gatot Subroto No. 10, Surabaya'),
('CUST004', 'Dewi Lestari', 'dewi@email.com', '084567890123', 'Jl. Diponegoro No. 5, Yogyakarta'),
('CUST005', 'Eko Prasetyo', 'eko@email.com', '085678901234', 'Jl. Ahmad Yani No. 15, Semarang');

INSERT INTO purchase_history (customer_id, event_id, product_id, product_name, quantity, total_amount, source) VALUES
('CUST001', 'EVT-SEED-001', 'PROD001', 'Laptop ASUS VivoBook', 1, 250000.00, 'pos'),
('CUST002', 'EVT-SEED-002', 'PROD002', 'Mouse Logitech M331', 2, 175000.00, 'pos'),
('CUST003', 'EVT-SEED-003', 'PROD004', 'Monitor Samsung 24"', 2, 520000.00, 'pos');
