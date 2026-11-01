-- Fields the core donation flow (post -> AI check -> match -> QR pickup ->
-- delivery) needs that migrations 001-015 don't have.
--
-- food_category + storage_condition: the server derives expiry_estimate from
-- these two plus prepared_at (cooked rice left at room temperature does not
-- last as long as packaged biscuits in a fridge), instead of trusting a
-- free-typed expiry from the donor.
--
-- diet_type / allergens on donations and accepted_diets on ngo_profiles: the
-- matcher must never offer a non-veg donation to a veg-only NGO. accepted_diets
-- defaults to every diet so existing NGO rows keep matching exactly as before.
ALTER TABLE donations
  ADD COLUMN food_category ENUM('cooked_meal', 'bakery', 'raw_produce', 'dairy', 'packaged') NOT NULL DEFAULT 'cooked_meal' AFTER food_type,
  ADD COLUMN storage_condition ENUM('room_temp', 'refrigerated', 'hot_held') NOT NULL DEFAULT 'room_temp' AFTER food_category,
  ADD COLUMN diet_type ENUM('veg', 'non_veg', 'jain', 'vegan') NOT NULL DEFAULT 'veg' AFTER storage_condition,
  ADD COLUMN allergens VARCHAR(255) NULL AFTER diet_type;

ALTER TABLE ngo_profiles
  ADD COLUMN accepted_diets SET('veg', 'non_veg', 'jain', 'vegan') NOT NULL DEFAULT 'veg,non_veg,jain,vegan';

-- pickup_verifications (migration 007) only records one handover — donor to
-- volunteer. The delivery leg (volunteer to NGO) is verified the same way, with
-- a second code shown by the NGO and scanned by the volunteer, so both ends of
-- the trip are proven by the volunteer physically being there. Kept on the same
-- row rather than a new table because it is 1:1 with the pickup and never
-- queried on its own.
ALTER TABLE pickup_verifications
  ADD COLUMN delivery_code_hash VARCHAR(255) NULL AFTER verification_status,
  ADD COLUMN delivery_scanned_at DATETIME NULL AFTER delivery_code_hash,
  ADD CONSTRAINT uq_pickup_verifications_delivery_hash UNIQUE (delivery_code_hash);

-- Radius beyond which an NGO is not offered a donation at all. 15 km is the
-- value the seeded match scores in 002_seed_sample_data.sql were computed with.
INSERT INTO system_config (config_key, config_value, description)
VALUES
  ('recommendation.max_radius_km', '15', 'NGOs farther than this from the donor are not recommended. Also the distance at which the distance component of the match score reaches 0.'),
  ('recommendation.max_candidates', '5', 'Maximum number of NGOs a single donation is recommended to.')
ON DUPLICATE KEY UPDATE config_key = config_key;
