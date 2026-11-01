CREATE TABLE IF NOT EXISTS donor_profiles (
  donor_id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL UNIQUE,
  business_name VARCHAR(150) NOT NULL,
  business_type ENUM('restaurant', 'hotel', 'bakery', 'grocery_store', 'household') NOT NULL,
  address       TEXT NOT NULL,
  latitude      DECIMAL(10, 7) NOT NULL,
  longitude     DECIMAL(10, 7) NOT NULL,

  CONSTRAINT fk_donor_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  INDEX idx_donor_profiles_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
