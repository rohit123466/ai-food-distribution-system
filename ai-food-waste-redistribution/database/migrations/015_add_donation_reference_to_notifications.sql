-- The `notifications` table (migration 008) has no way to say which donation a
-- status-change notification (FR-D7) is about except by parsing donation_id
-- out of the free-text `message` column, which isn't queryable. Add an
-- optional FK so the client can, for example, fetch "every notification about
-- donation #42" or deep-link a notification straight to its donation record.
-- Nullable because not every notification type (e.g. an account-level message
-- from an admin) is about a specific donation.
ALTER TABLE notifications
  ADD COLUMN donation_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_notifications_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE SET NULL,
  ADD INDEX idx_notifications_donation (donation_id);
