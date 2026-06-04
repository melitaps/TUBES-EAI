-- ============================================
-- Accounting Service Database Schema (PostgreSQL)
-- ============================================

CREATE TABLE IF NOT EXISTS journals (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) UNIQUE,
  journal_no VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(500),
  total_amount DECIMAL(12,2),
  source VARCHAR(50),
  status VARCHAR(20) DEFAULT 'posted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  journal_id INT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0
);

-- Seed Data
INSERT INTO journals (event_id, journal_no, description, total_amount, source) VALUES
('EVT-SEED-001', 'JRN-20240101-001', 'Penjualan POS - INV-20240101-001', 250000.00, 'pos'),
('EVT-SEED-002', 'JRN-20240101-002', 'Penjualan POS - INV-20240101-002', 175000.00, 'pos'),
('EVT-SEED-003', 'JRN-20240102-001', 'Penjualan POS - INV-20240102-001', 520000.00, 'pos');

INSERT INTO journal_entries (journal_id, account_code, account_name, debit, credit) VALUES
(1, '1100', 'Kas', 250000.00, 0),
(1, '4100', 'Pendapatan Penjualan', 0, 250000.00),
(2, '1100', 'Kas', 175000.00, 0),
(2, '4100', 'Pendapatan Penjualan', 0, 175000.00),
(3, '1100', 'Kas', 520000.00, 0),
(3, '4100', 'Pendapatan Penjualan', 0, 520000.00);
