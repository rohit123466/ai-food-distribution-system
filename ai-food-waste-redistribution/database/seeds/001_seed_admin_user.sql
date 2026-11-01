-- Bootstrap admin account. Replace :password_hash before running — generate it with:
--   node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "YourChosenPassword"
-- (once auth/bcrypt land in Module 3). Do not commit a real hash or password to this file.
INSERT INTO users (name, email, password_hash, phone, role)
VALUES (
  'Platform Admin',
  'admin@foodwaste.local',
  :password_hash,
  NULL,
  'admin'
)
ON DUPLICATE KEY UPDATE name = name;
