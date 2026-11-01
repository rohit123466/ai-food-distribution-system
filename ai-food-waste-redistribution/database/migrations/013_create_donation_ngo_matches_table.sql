-- Recommendation-engine output. SRS FR-N2 ("ranked, map-based feed of nearby
-- available donations") and FR-N3 ("Accept or reject a recommended donation").
--
-- donations.assigned_ngo_id (migration 005) can only hold the single NGO a
-- donation ends up with — it has nowhere to record which *other* NGOs were
-- offered the same donation first, at what rank, or that they let it expire or
-- rejected it. That history is exactly what the recommendation engine needs to
-- avoid re-offering an already-declined donation to the same NGO, and what an
-- admin needs to audit "why did NGO X get this instead of NGO Y". One row per
-- (donation, NGO) candidate pair captures that.
CREATE TABLE IF NOT EXISTS donation_ngo_matches (
  match_id      INT AUTO_INCREMENT PRIMARY KEY,
  donation_id   INT NOT NULL,
  ngo_id        INT NOT NULL,
  distance_km   DECIMAL(6, 2) NOT NULL,
  demand_weight DECIMAL(5, 2) NOT NULL,
  match_score   DECIMAL(6, 3) NOT NULL,
  match_rank    INT NOT NULL,
  match_status  ENUM('recommended', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'recommended',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at  DATETIME,

  CONSTRAINT fk_donation_ngo_matches_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
  CONSTRAINT fk_donation_ngo_matches_ngo
    FOREIGN KEY (ngo_id) REFERENCES ngo_profiles(ngo_id) ON DELETE CASCADE,

  CONSTRAINT chk_donation_ngo_matches_distance CHECK (distance_km >= 0),
  CONSTRAINT chk_donation_ngo_matches_rank CHECK (match_rank > 0),

  UNIQUE KEY uq_donation_ngo_matches_pair (donation_id, ngo_id),
  INDEX idx_donation_ngo_matches_ngo_status (ngo_id, match_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
