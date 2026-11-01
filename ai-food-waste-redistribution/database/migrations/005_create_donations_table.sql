CREATE TABLE IF NOT EXISTS donations (
  donation_id          INT AUTO_INCREMENT PRIMARY KEY,
  donor_id             INT NOT NULL,
  food_type            VARCHAR(100) NOT NULL,
  quantity_kg          DECIMAL(6, 2) NOT NULL,
  prepared_at          DATETIME NOT NULL,
  expiry_estimate      DATETIME NOT NULL,
  freshness_status     ENUM('pending', 'fresh', 'spoiled') NOT NULL DEFAULT 'pending',
  status               ENUM('posted', 'accepted', 'assigned', 'picked_up', 'delivered', 'rejected') NOT NULL DEFAULT 'posted',
  assigned_ngo_id       INT,
  assigned_volunteer_id INT,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_donations_donor
    FOREIGN KEY (donor_id) REFERENCES donor_profiles(donor_id) ON DELETE CASCADE,
  CONSTRAINT fk_donations_ngo
    FOREIGN KEY (assigned_ngo_id) REFERENCES ngo_profiles(ngo_id) ON DELETE SET NULL,
  CONSTRAINT fk_donations_volunteer
    FOREIGN KEY (assigned_volunteer_id) REFERENCES volunteer_profiles(volunteer_id) ON DELETE SET NULL,

  INDEX idx_donations_status (status),
  INDEX idx_donations_donor (donor_id),
  INDEX idx_donations_ngo (assigned_ngo_id),
  INDEX idx_donations_volunteer (assigned_volunteer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
