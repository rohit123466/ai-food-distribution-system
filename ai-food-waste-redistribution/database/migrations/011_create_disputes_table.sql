-- Admin dispute resolution. SRS FR-A3: "Resolve disputes flagged on a donation
-- (e.g., failed QR verification)."
--
-- A dispute is modeled as its own entity with its own lifecycle (open ->
-- under_review -> resolved/dismissed) rather than as a value of donations.status,
-- because the two state machines are orthogonal: a donation that is already
-- `delivered` in the physical/logistics sense can still have an open dispute
-- about *how* it was delivered. Conflating the two into one status column would
-- force a delivered-but-disputed donation to either stop looking delivered or
-- stop looking disputed — this table lets it be both at once.
CREATE TABLE IF NOT EXISTS disputes (
  dispute_id           INT AUTO_INCREMENT PRIMARY KEY,
  donation_id          INT NOT NULL,
  raised_by_user_id    INT NOT NULL,
  reason               VARCHAR(255) NOT NULL,
  description          TEXT,
  status               ENUM('open', 'under_review', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  resolved_by_admin_id INT,
  resolution_notes     TEXT,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at          DATETIME,

  CONSTRAINT fk_disputes_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE RESTRICT,
  CONSTRAINT fk_disputes_raised_by
    FOREIGN KEY (raised_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_disputes_resolved_by
    FOREIGN KEY (resolved_by_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,

  INDEX idx_disputes_donation (donation_id),
  INDEX idx_disputes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
