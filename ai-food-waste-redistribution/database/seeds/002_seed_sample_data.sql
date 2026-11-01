-- Realistic sample data spanning every table in the schema, including the
-- tables added in migrations 010-015. Unlike 001_seed_admin_user.sql, this
-- file is self-contained and needs no manual substitution — every password
-- hash below is the well-known bcrypt test vector for the plaintext string
-- "password" (cost 10). It is public and MUST NOT be used for anything beyond
-- local development seeding; nobody can be logged in as these accounts until
-- Module 3's registration flow issues them real hashes.
--
-- This file assumes it is run once, against a freshly migrated and otherwise
-- empty database, so that AUTO_INCREMENT ids come out as 1, 2, 3... and the
-- INSERTs below can reference each other by literal id instead of chaining
-- LAST_INSERT_ID() calls. That trade-off (readability over idempotency) is
-- deliberate for a hand-written demo dataset — it is not the pattern the
-- application itself should use for writes.
--
-- Run it by hand (it is not applied automatically by migrate.js, same as 001):
--   mysql -u root -p food_waste_redistribution < seeds/002_seed_sample_data.sql

-- ---------------------------------------------------------------------------
-- 1. Users — 1 admin, 2 donors, 2 NGOs, 2 volunteers
-- ---------------------------------------------------------------------------
INSERT INTO users (user_id, name, email, password_hash, phone, role) VALUES
  (1, 'Demo Admin',     'admin.demo@foodwaste.local',        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000001', 'admin'),
  (2, 'Rohan Malhotra', 'contact@spiceroutebanquets.in',     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000002', 'donor'),
  (3, 'Meera Kapoor',   'contact@grandmasbakery.in',         '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000003', 'donor'),
  (4, 'Anjali Verma',   'coordinator@annaseva.org',          '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000004', 'ngo'),
  (5, 'Devansh Rao',    'coordinator@secondharvestdelhi.org','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000005', 'ngo'),
  (6, 'Ramesh Kumar',   'ramesh.kumar@volunteers.local',     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000006', 'volunteer'),
  (7, 'Priya Nair',     'priya.nair@volunteers.local',       '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+91-9800000007', 'volunteer');

-- ---------------------------------------------------------------------------
-- 2. Role profiles — 1:1 with users, one row per non-admin account
-- ---------------------------------------------------------------------------
INSERT INTO donor_profiles (donor_id, user_id, business_name, business_type, address, latitude, longitude) VALUES
  (1, 2, 'Spice Route Banquets', 'hotel',  '14 Community Centre, Connaught Place, New Delhi, 110001', 28.6315000, 77.2167000),
  (2, 3, "Grandma's Bakery",     'bakery', 'B-42 Lajpat Nagar II, New Delhi, 110024',                  28.5677000, 77.2431000);

INSERT INTO ngo_profiles (ngo_id, user_id, ngo_name, registration_number, address, latitude, longitude, daily_capacity, current_demand_level) VALUES
  (1, 4, 'Anna Seva Foundation', 'NGO/DL/2019/00842', '18 Ajmal Khan Road, Karol Bagh, New Delhi, 110005', 28.6519000, 77.1909000, 150, 'high'),
  (2, 5, 'Second Harvest Delhi', 'NGO/DL/2021/01187', 'D-Block Market, Saket, New Delhi, 110017',           28.5245000, 77.2066000,  80, 'medium');

INSERT INTO volunteer_profiles (volunteer_id, user_id, vehicle_type, is_available, current_lat, current_lng) VALUES
  (1, 6, 'bike', TRUE, 28.6300000, 77.2190000),
  (2, 7, 'car',  TRUE, 28.5250000, 77.2100000);

-- ---------------------------------------------------------------------------
-- 3. Donations — one full lifecycle, one in progress, one just posted, one
--    historical/disputed. Each INSERT and status-changing UPDATE below fires
--    the triggers from migration 010, so donation_status_log needs no manual
--    inserts at all — it is populated purely as a side effect of the writes
--    a real application would already be making.
-- ---------------------------------------------------------------------------

-- Donation 1: full happy path, posted -> ... -> delivered.
INSERT INTO donations
  (donation_id, donor_id, food_type, quantity_kg, prepared_at, expiry_estimate, freshness_status, status, created_at)
VALUES
  (1, 1, 'Mixed vegetarian banquet meal (rice, dal, mixed vegetable curry, roti)', 45.00,
   '2026-07-20 21:30:00', '2026-07-21 05:30:00', 'pending', 'posted', '2026-07-20 21:45:00');

UPDATE donations SET freshness_status = 'fresh' WHERE donation_id = 1;                              -- AI service scores the upload
UPDATE donations SET status = 'accepted', assigned_ngo_id = 1 WHERE donation_id = 1;                 -- Anna Seva accepts the top match
UPDATE donations SET status = 'assigned', assigned_volunteer_id = 1 WHERE donation_id = 1;           -- Ramesh takes the pickup task
UPDATE donations SET status = 'picked_up' WHERE donation_id = 1;                                     -- volunteer collects from the donor
UPDATE donations SET status = 'delivered' WHERE donation_id = 1;                                     -- QR scanned at Anna Seva

-- Donation 2: in progress, currently sitting at "assigned" (not yet picked up).
INSERT INTO donations
  (donation_id, donor_id, food_type, quantity_kg, prepared_at, expiry_estimate, freshness_status, status, created_at)
VALUES
  (2, 2, 'Assorted bread and pastries (end-of-day surplus)', 8.50,
   '2026-07-22 06:00:00', '2026-07-23 06:00:00', 'pending', 'posted', '2026-07-22 06:15:00');

UPDATE donations SET freshness_status = 'fresh' WHERE donation_id = 2;
UPDATE donations SET status = 'accepted', assigned_ngo_id = 2 WHERE donation_id = 2;
UPDATE donations SET status = 'assigned', assigned_volunteer_id = 2 WHERE donation_id = 2;

-- Donation 3: just posted, AI freshness check not back yet — demonstrates the
-- Section 7 NFR that a donation is saved and visible even before/without the
-- AI service weighing in.
INSERT INTO donations
  (donation_id, donor_id, food_type, quantity_kg, prepared_at, expiry_estimate, freshness_status, status, created_at)
VALUES
  (3, 1, 'Leftover paneer and rice (small batch)', 12.00,
   '2026-07-22 13:00:00', '2026-07-22 19:00:00', 'pending', 'posted', '2026-07-22 13:10:00');

-- Donation 4: historical, delivered, but its handover had a failed QR scan —
-- feeds the disputes example below.
INSERT INTO donations
  (donation_id, donor_id, food_type, quantity_kg, prepared_at, expiry_estimate, freshness_status, status, created_at)
VALUES
  (4, 2, 'Surplus cupcakes and cookies (event order overrun)', 5.00,
   '2026-07-14 18:00:00', '2026-07-15 02:00:00', 'pending', 'posted', '2026-07-14 18:20:00');

UPDATE donations SET freshness_status = 'fresh' WHERE donation_id = 4;
UPDATE donations SET status = 'accepted', assigned_ngo_id = 1 WHERE donation_id = 4;
UPDATE donations SET status = 'assigned', assigned_volunteer_id = 1 WHERE donation_id = 4;
UPDATE donations SET status = 'picked_up' WHERE donation_id = 4;
UPDATE donations SET status = 'delivered' WHERE donation_id = 4;   -- recorded delivered manually after the dispute below was resolved

-- ---------------------------------------------------------------------------
-- 4. Donation images — AI labels/confidence null until the model has run
-- ---------------------------------------------------------------------------
INSERT INTO donation_images (image_id, donation_id, image_url, ai_labels, ai_confidence) VALUES
  (1, 1, 'https://res.cloudinary.com/demo/food-waste/donation-1-a.jpg', JSON_OBJECT('labels', JSON_ARRAY('rice', 'dal', 'vegetable_curry', 'roti'), 'primary', 'mixed_meal'), 0.9200),
  (2, 1, 'https://res.cloudinary.com/demo/food-waste/donation-1-b.jpg', JSON_OBJECT('labels', JSON_ARRAY('rice', 'curry'), 'primary', 'mixed_meal'),                       0.8800),
  (3, 2, 'https://res.cloudinary.com/demo/food-waste/donation-2-a.jpg', JSON_OBJECT('labels', JSON_ARRAY('bread', 'pastry'), 'primary', 'bakery'),                        0.9500),
  (4, 3, 'https://res.cloudinary.com/demo/food-waste/donation-3-a.jpg', NULL, NULL),
  (5, 4, 'https://res.cloudinary.com/demo/food-waste/donation-4-a.jpg', JSON_OBJECT('labels', JSON_ARRAY('cupcake', 'cookie'), 'primary', 'bakery'),                      0.9000);

-- ---------------------------------------------------------------------------
-- 5. Recommendation-engine output (migration 013). Weights/thresholds referenced
--    here are the ones seeded into system_config below.
-- ---------------------------------------------------------------------------
INSERT INTO donation_ngo_matches (donation_id, ngo_id, distance_km, demand_weight, match_score, match_rank, match_status, responded_at) VALUES
  (1, 1,  3.10, 1.00, 0.876, 1, 'accepted', '2026-07-20 21:52:00'),
  (1, 2, 12.40, 0.60, 0.344, 2, 'expired',  NULL),
  (2, 2,  5.50, 0.60, 0.620, 1, 'accepted', '2026-07-22 06:22:00'),
  (3, 1,  3.40, 1.00, 0.864, 1, 'recommended', NULL),
  (3, 2, 12.10, 0.60, 0.356, 2, 'recommended', NULL),
  (4, 1, 11.20, 1.00, 0.552, 1, 'accepted', '2026-07-14 18:30:00');

-- ---------------------------------------------------------------------------
-- 6. Pickup verifications — one verified, one still pending (not picked up
--    yet), one failed (feeds the dispute below)
-- ---------------------------------------------------------------------------
INSERT INTO pickup_verifications (pickup_id, donation_id, volunteer_id, qr_code_hash, scanned_at, verification_status) VALUES
  (1, 1, 1, 'a3ab904290e91a36306871624f0b6ef5ccecd6f00d0244b2e958f993bf581fc', '2026-07-21 02:10:00', 'verified'),
  (2, 2, 2, '0fe10aa39c64337120f2ddcbc9d436dc9c0b56d1a00dc7680c64e2c08b49ab45', NULL,                  'pending'),
  (3, 4, 1, 'db74d79b7c1a5e55029c3c4b9f569e92773875e20fa2d9e6db244a3996bd3ff3', '2026-07-14 22:05:00', 'failed');

-- ---------------------------------------------------------------------------
-- 7. Disputes (migration 011) — the failed scan on donation 4, resolved by admin
-- ---------------------------------------------------------------------------
INSERT INTO disputes (dispute_id, donation_id, raised_by_user_id, reason, description, status, resolved_by_admin_id, resolution_notes, created_at, resolved_at) VALUES
  (1, 4, 4, 'QR scan failed at handover',
   'Volunteer arrived and handed the donation to our team, but the QR code would not scan at pickup. Delivery happened; verification did not.',
   'resolved', 1,
   'Verified via the volunteer''s GPS trail and a confirmation call with the NGO; donation marked delivered manually. Root cause was a damaged print-out, not a platform bug — no QR regeneration needed.',
   '2026-07-14 22:10:00', '2026-07-15 09:40:00');

-- ---------------------------------------------------------------------------
-- 8. Notifications (migration 015 adds donation_id)
-- ---------------------------------------------------------------------------
INSERT INTO notifications (notification_id, user_id, donation_id, message, type, is_read, sent_at) VALUES
  (1, 2, 1, 'Your donation #1 has been accepted by Anna Seva Foundation.',            'status_change', TRUE,  '2026-07-20 21:52:00'),
  (2, 2, 1, 'Your donation #1 was delivered successfully. Thank you!',                'status_change', FALSE, '2026-07-21 02:11:00'),
  (3, 4, 3, 'A new donation near you is awaiting your response.',                     'assignment',    FALSE, '2026-07-22 13:11:00'),
  (4, 6, 1, 'You have been assigned a new pickup task.',                             'assignment',    TRUE,  '2026-07-20 21:53:00'),
  (5, 4, 4, 'The dispute you raised on donation #4 has been resolved.',              'dispute',       FALSE, '2026-07-15 09:41:00');

-- ---------------------------------------------------------------------------
-- 9. Carbon logs — computed once a donation reaches "delivered"
-- ---------------------------------------------------------------------------
INSERT INTO carbon_logs (log_id, donation_id, co2_saved_kg, meals_equivalent) VALUES
  (1, 1, 112.500, 90.00),
  (2, 4,  12.500, 10.00);

-- ---------------------------------------------------------------------------
-- 10. System config (migration 012) — the weights actually used above
-- ---------------------------------------------------------------------------
INSERT INTO system_config (config_key, config_value, description, updated_by_admin_id) VALUES
  ('recommendation.distance_weight', '0.60', 'Weight (0-1) given to proximity in the NGO match-score formula: score = distance_weight * distance_component + demand_weight * demand_component.', 1),
  ('recommendation.demand_weight',   '0.40', 'Weight (0-1) given to an NGO''s current stated demand level in the match-score formula.', 1),
  ('freshness.fresh_min_score',      '70',   'Minimum AI freshness score (0-100) required to auto-label a donation "fresh"; below this it is labeled "spoiled" and hidden from NGO feeds.', 1),
  ('qr.expiry_hours',                '24',   'Hours after generation before an unscanned QR code is treated as expired and eligible for regeneration.', 1);
