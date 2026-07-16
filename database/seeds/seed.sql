-- Seed: Create default admin account
-- Password: admin123 (bcrypt hash)
INSERT INTO admins (name, phone, password_hash)
VALUES (
  'Super Admin',
  '+9647700000000',
  '$2a$12$LJ3m4ys1Lz4Y2H4g5X5z5O5X5X5X5X5X5X5X5X5X5X5X5X5X5X'
)
ON CONFLICT (phone) DO NOTHING;

-- Seed: Example zone (Baghdad - Al Mansour area)
-- Note: This is a sample polygon for testing
INSERT INTO zones (name, delivery_price, driver_deduction, boundary)
VALUES (
  'Al Mansour',
  3000.00,
  2000.00,
  ST_GeogFromText('SRID=4326;POLYGON((44.3500 33.3100, 44.3600 33.3100, 44.3600 33.3200, 44.3500 33.3200, 44.3500 33.3100))')
)
ON CONFLICT DO NOTHING;

-- Seed: Sample recharge codes
INSERT INTO recharge_codes (code, value) VALUES
  ('ABCD-1234-EFGH', 50000.00),
  ('IJKL-5678-MNOP', 100000.00),
  ('QRST-9012-UVWX', 200000.00)
ON CONFLICT (code) DO NOTHING;
