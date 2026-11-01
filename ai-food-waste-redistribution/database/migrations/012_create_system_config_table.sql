-- Admin-tunable platform parameters. SRS FR-A4: "Configure system parameters
-- (recommendation weighting, freshness thresholds)."
--
-- Modeled as a generic key/value table rather than dedicated columns on some
-- `settings` table, because the set of tunable parameters is expected to grow
-- (Section 17, Future Scope) and none of these values participate in joins,
-- filters, or foreign keys anywhere else in the schema — the only two
-- operations ever performed against this table are "read all" and "update one
-- row by key". A wide fixed-column settings table would need a schema
-- migration for every new tunable; this needs an INSERT.
CREATE TABLE IF NOT EXISTS system_config (
  config_key          VARCHAR(100) PRIMARY KEY,
  config_value        VARCHAR(255) NOT NULL,
  description          VARCHAR(255),
  updated_by_admin_id  INT,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_system_config_admin
    FOREIGN KEY (updated_by_admin_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
