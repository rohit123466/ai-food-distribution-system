CREATE TABLE IF NOT EXISTS volunteer_profiles (
  volunteer_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL UNIQUE,
  vehicle_type  ENUM('on_foot', 'bike', 'car', 'van') NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  current_lat   DECIMAL(10, 7),
  current_lng   DECIMAL(10, 7),

  CONSTRAINT fk_volunteer_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  INDEX idx_volunteer_profiles_availability (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
