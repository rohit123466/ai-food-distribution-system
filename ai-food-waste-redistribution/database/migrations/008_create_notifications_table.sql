CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  message          TEXT NOT NULL,
  type             VARCHAR(50) NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  INDEX idx_notifications_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
