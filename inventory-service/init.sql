-- ============================================
-- Inventory Service Database Schema (PostgreSQL)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  stock INT NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id),
  event_id VARCHAR(100) UNIQUE,
  movement_type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  stock_before INT,
  stock_after INT,
  reference VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data
INSERT INTO products (id, name, description, stock, price, category) VALUES
('PROD001', 'Laptop ASUS VivoBook', 'ASUS VivoBook 14" Intel Core i5', 50, 7500000.00, 'Laptop'),
('PROD002', 'Mouse Logitech M331', 'Logitech Silent Plus Wireless Mouse', 200, 250000.00, 'Accessories'),
('PROD003', 'Keyboard Mechanical', 'RGB Mechanical Keyboard Blue Switch', 150, 450000.00, 'Accessories'),
('PROD004', 'Monitor Samsung 24"', 'Samsung 24" FHD IPS Monitor', 75, 2800000.00, 'Monitor'),
('PROD005', 'USB Hub 4 Port', 'USB 3.0 Hub 4 Port Aluminium', 300, 150000.00, 'Accessories'),
('PROD006', 'Webcam Logitech C920', 'Logitech C920 HD Pro Webcam', 100, 1200000.00, 'Accessories'),
('PROD007', 'Headset Gaming', 'HyperX Cloud II Gaming Headset', 80, 950000.00, 'Audio'),
('PROD008', 'SSD Samsung 500GB', 'Samsung 870 EVO 500GB SATA SSD', 120, 850000.00, 'Storage'),
('PROD009', 'RAM DDR4 16GB', 'Corsair Vengeance LPX DDR4 16GB', 90, 650000.00, 'Components'),
('PROD010', 'Printer Epson L3210', 'Epson EcoTank L3210 All-in-One', 40, 2100000.00, 'Printer');
