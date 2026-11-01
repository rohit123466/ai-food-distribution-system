CREATE TABLE IF NOT EXISTS donation_images (
  image_id      INT AUTO_INCREMENT PRIMARY KEY,
  donation_id   INT NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  ai_labels     JSON,
  ai_confidence DECIMAL(5, 4),

  CONSTRAINT fk_donation_images_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,

  INDEX idx_donation_images_donation (donation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
