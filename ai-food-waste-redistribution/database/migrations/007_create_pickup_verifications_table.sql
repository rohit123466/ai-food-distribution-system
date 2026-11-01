CREATE TABLE IF NOT EXISTS pickup_verifications (
  pickup_id           INT AUTO_INCREMENT PRIMARY KEY,
  donation_id         INT NOT NULL UNIQUE,
  volunteer_id        INT NOT NULL,
  qr_code_hash        VARCHAR(255) NOT NULL,
  scanned_at          DATETIME,
  verification_status ENUM('pending', 'verified', 'failed') NOT NULL DEFAULT 'pending',

  CONSTRAINT fk_pickup_verifications_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
  CONSTRAINT fk_pickup_verifications_volunteer
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id) ON DELETE CASCADE,

  INDEX idx_pickup_verifications_volunteer (volunteer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
