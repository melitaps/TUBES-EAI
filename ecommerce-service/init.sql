-- ============================================
-- E-Commerce Service Database Schema (PostgreSQL)
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(50),
  customer_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(200),
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL
);

-- Seed Data
INSERT INTO orders (order_no, customer_id, customer_name, status, total_amount) VALUES
('ORD-20240101-001', 'CUST001', 'Budi Santoso', 'completed', 1200000.00),
('ORD-20240101-002', 'CUST003', 'Ahmad Hidayat', 'completed', 450000.00),
('ORD-20240102-001', 'CUST002', 'Siti Rahayu', 'pending', 850000.00);

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
(1, 'PROD006', 'Webcam Logitech C920', 1, 1200000.00, 1200000.00),
(2, 'PROD003', 'Keyboard Mechanical', 1, 450000.00, 450000.00),
(3, 'PROD008', 'SSD Samsung 500GB', 1, 850000.00, 850000.00);
