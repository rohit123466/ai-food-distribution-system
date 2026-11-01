CREATE TABLE IF NOT EXISTS ngo_profiles (
  ngo_id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id              INT NOT NULL UNIQUE,
  ngo_name             VARCHAR(150) NOT NULL,
  registration_number  VARCHAR(100) NOT NULL UNIQUE,
  address              TEXT NOT NULL,
  latitude             DECIMAL(10, 7) NOT NULL,
  longitude            DECIMAL(10, 7) NOT NULL,
  daily_capacity       INT NOT NULL DEFAULT 0,
  current_demand_level ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',

  CONSTRAINT fk_ngo_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  INDEX idx_ngo_profiles_location (latitude, longitude),
  INDEX idx_ngo_profiles_demand (current_demand_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
