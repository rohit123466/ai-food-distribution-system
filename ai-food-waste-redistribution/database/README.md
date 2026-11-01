# Database

Plain SQL migrations, applied in filename order by `migrate.js`. Each applied file is recorded in a `schema_migrations` table so re-running the script is a no-op for anything already applied.

## Usage

```bash
npm install
npm run migrate
```

Reads connection settings from `../server/.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). The target database must already exist — create it once with:

```sql
CREATE DATABASE food_waste_redistribution;
```

## Seeds

Files under `seeds/` are **not** run automatically by `migrate.js` — run them by hand:

```bash
mysql -u root -p food_waste_redistribution < seeds/002_seed_sample_data.sql
```

`001_seed_admin_user.sql` is a template with a `:password_hash` placeholder you fill in once Module 3's auth flow exists. `002_seed_sample_data.sql` is fully self-contained (fake bcrypt hashes, clearly marked) and populates every table with a realistic dataset — a full donor→NGO→volunteer→delivery lifecycle, an in-progress donation, a freshly-posted one still awaiting an AI/recommendation pass, and a historical delivery with a resolved dispute. It assumes a freshly migrated, empty database (see the file header).

## Schema

Thirteen tables, normalized to 3NF. Migrations 001-009 are the original core: `users` (one row per login identity) plus 1:1 role-profile tables (`donor_profiles`, `ngo_profiles`, `volunteer_profiles`), the transactional hub `donations`, and its dependents `donation_images`, `pickup_verifications`, `notifications`, `carbon_logs`.

Migrations 010-015 close gaps between that core schema and the functional requirements in the Module 1 artifact that didn't yet have a table to back them:

| Migration | Table / change | Closes |
|---|---|---|
| `010` | `donation_status_log` (+ triggers) | FR-S3 — immutable, timestamped status history |
| `011` | `disputes` | FR-A3 — admin dispute resolution |
| `012` | `system_config` | FR-A4 — admin-tunable recommendation weights / freshness threshold |
| `013` | `donation_ngo_matches` | FR-N2/FR-N3 — ranked NGO recommendations and accept/reject history |
| `014` | CHECK/UNIQUE hardening on 001-009 | Section 7 NFR — integrity enforced at the DB layer |
| `015` | `notifications.donation_id` | FR-D7 — link a notification back to its donation |

Every statement in 010-015 was applied against a real MySQL 8.0.46 instance and exercised (including deliberately-bad writes) while writing this schema — not just reviewed by eye. Full table-by-table and constraint-by-constraint rationale is in the published database design artifact; the ER diagram in Module 1 Sections 12–13 predates these six migrations and covers only the original nine tables.
