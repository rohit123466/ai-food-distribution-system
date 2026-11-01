CREATE TABLE IF NOT EXISTS carbon_logs (
  log_id           INT AUTO_INCREMENT PRIMARY KEY,
  donation_id      INT NOT NULL UNIQUE,
  co2_saved_kg     DECIMAL(8, 3) NOT NULL,
  meals_equivalent DECIMAL(6, 2) NOT NULL,

  CONSTRAINT fk_carbon_logs_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
