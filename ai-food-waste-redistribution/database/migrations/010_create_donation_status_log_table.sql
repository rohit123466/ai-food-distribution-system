-- Append-only audit trail for donations.status transitions.
-- SRS FR-S3: "All state transitions on a donation are timestamped and immutable
-- once written." The two AFTER triggers on `donations` populate this table
-- automatically so no code path can change a donation's status without leaving
-- a record; the two BEFORE triggers on this table itself refuse UPDATE/DELETE,
-- enforcing immutability in the database rather than trusting application code
-- (Section 7 NFR: "Referential integrity enforced at the database layer").
--
-- donation_id is ON DELETE RESTRICT, not CASCADE: MySQL does not fire triggers
-- for rows removed by a cascading foreign key action (this was verified against
-- a live MySQL 8.0.46 instance while building this schema — an earlier CASCADE
-- draft let a donation and its entire log silently disappear together, which is
-- the opposite of "immutable"). RESTRICT instead makes the delete itself fail
-- via the FK constraint as soon as the donation has any log row — which, because
-- of the AFTER INSERT trigger below, is always, from the moment it's created.
-- Net effect: a donation can never be hard-deleted, only moved through statuses.
CREATE TABLE IF NOT EXISTS donation_status_log (
  log_id             INT AUTO_INCREMENT PRIMARY KEY,
  donation_id        INT NOT NULL,
  old_status         ENUM('posted', 'accepted', 'assigned', 'picked_up', 'delivered', 'rejected'),
  new_status         ENUM('posted', 'accepted', 'assigned', 'picked_up', 'delivered', 'rejected') NOT NULL,
  changed_by_user_id INT,
  changed_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_donation_status_log_donation
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE RESTRICT,
  CONSTRAINT fk_donation_status_log_user
    FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,

  INDEX idx_donation_status_log_donation (donation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Auto-log every donation's initial status at creation.
DROP TRIGGER IF EXISTS trg_donations_log_insert;
CREATE TRIGGER trg_donations_log_insert
AFTER INSERT ON donations
FOR EACH ROW
INSERT INTO donation_status_log (donation_id, old_status, new_status)
VALUES (NEW.donation_id, NULL, NEW.status);

-- Auto-log any change to donations.status. changed_by_user_id is left NULL here;
-- application code that knows which user triggered the change should perform its
-- own explicit INSERT with that id instead of relying on this trigger for
-- attribution — this trigger is the safety net that guarantees a row exists even
-- if that explicit insert is ever missed, not the primary attribution path.
DROP TRIGGER IF EXISTS trg_donations_log_update;
CREATE TRIGGER trg_donations_log_update
AFTER UPDATE ON donations
FOR EACH ROW
INSERT INTO donation_status_log (donation_id, old_status, new_status)
SELECT NEW.donation_id, OLD.status, NEW.status
WHERE OLD.status <> NEW.status;

-- Refuse to modify or remove a written log row directly (the FK above is what
-- stops a log row from disappearing as a side effect of deleting its donation;
-- these two stop it from being touched on its own).
DROP TRIGGER IF EXISTS trg_donation_status_log_no_update;
CREATE TRIGGER trg_donation_status_log_no_update
BEFORE UPDATE ON donation_status_log
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'donation_status_log rows are immutable and cannot be updated';

DROP TRIGGER IF EXISTS trg_donation_status_log_no_delete;
CREATE TRIGGER trg_donation_status_log_no_delete
BEFORE DELETE ON donation_status_log
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'donation_status_log rows are immutable and cannot be deleted';
