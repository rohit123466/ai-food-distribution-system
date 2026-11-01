-- Additive hardening of tables created in migrations 001-009, per the Section 7
-- NFR "Referential integrity enforced at the database layer, not just
-- application code." None of these change a column's type or nullability, so
-- they are safe to run against a database that already has rows in it.
-- Requires MySQL 8.0.16+, which is the platform's stated minimum (SRS 8.2) —
-- earlier 8.0.x versions parse CHECK but do not enforce it.

ALTER TABLE donor_profiles
  ADD CONSTRAINT chk_donor_profiles_lat CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT chk_donor_profiles_lng CHECK (longitude BETWEEN -180 AND 180);

ALTER TABLE ngo_profiles
  ADD CONSTRAINT chk_ngo_profiles_lat CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT chk_ngo_profiles_lng CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT chk_ngo_profiles_capacity CHECK (daily_capacity >= 0);

ALTER TABLE volunteer_profiles
  ADD CONSTRAINT chk_volunteer_profiles_lat CHECK (current_lat BETWEEN -90 AND 90),
  ADD CONSTRAINT chk_volunteer_profiles_lng CHECK (current_lng BETWEEN -180 AND 180);

ALTER TABLE donations
  ADD CONSTRAINT chk_donations_quantity CHECK (quantity_kg > 0),
  ADD CONSTRAINT chk_donations_expiry_after_prepared CHECK (expiry_estimate > prepared_at);

ALTER TABLE donation_images
  ADD CONSTRAINT chk_donation_images_confidence CHECK (ai_confidence BETWEEN 0 AND 1);

ALTER TABLE carbon_logs
  ADD CONSTRAINT chk_carbon_logs_co2 CHECK (co2_saved_kg >= 0),
  ADD CONSTRAINT chk_carbon_logs_meals CHECK (meals_equivalent >= 0);

-- A QR hash is meant to identify exactly one donation's handover. Without this,
-- two pickup_verifications rows could theoretically share a hash (e.g. a UUID
-- collision or a buggy generator), and a scan would have no unique row to
-- resolve to.
ALTER TABLE pickup_verifications
  ADD CONSTRAINT uq_pickup_verifications_qr_hash UNIQUE (qr_code_hash);
