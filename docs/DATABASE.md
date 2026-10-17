# Database design

MySQL is the source of truth. Timestamps are stored as UTC `DATETIME(6)` values; business-date parsing and display use `Asia/Kolkata` by default.

## Migration policy

SQL files in `server/src/database/migrations` are applied in lexical order. Applied filenames are recorded in `schema_migrations`; `npm run db:status` reports each migration as `UP` or `DOWN`. Production application startup never mutates the schema automatically. The current migration set is `001_initial_schema.sql` and `002_email_verification_otp.sql`.

The initial migration contains:

- users and stable role/status constraints;
- hashed, expiring, single-use verification and password-reset tokens;
- opaque refresh-session hashes with rotation/reuse-detection support;
- canonical companies with Agent-created review state;
- one timesheet per Agent and business date;
- soft-deletable visits with company-name snapshots and positive-duration constraints;
- append-only review and audit history;
- a persistent notification outbox.

The unique `(agent_id, work_date)` key guarantees one daily timesheet per Agent and date. A sheet may contain multiple company visits; each visit has its own check-in/check-out interval. The selected work date is interpreted in `BUSINESS_TIMEZONE` (default `Asia/Kolkata`), while visit timestamps are stored as UTC `DATETIME(6)`. The service rejects future work dates, checkout times not later than check-in, and overlapping visits on the same sheet.

## Verify migrations

Apply pending migrations and inspect the ledger:

```bash
npm run db:migrate
npm run db:status
```

The verified local database reports `UP` for both migration files. Keep production migration execution as a release step using a migration identity with DDL privileges; the application runtime should use a separate least-privilege account.

MySQL may implicitly commit DDL, so a failed migration is not guaranteed to roll back atomically even though the runner wraps each file in a transaction. Inspect the reported statement and `schema_migrations` before retrying; do not manually mark a partially applied migration as complete.

Foreign keys use restrictive deletion policies where history must survive. User-facing account removal is therefore implemented as deactivation rather than physical deletion.

## Development reset

Only for a disposable local database:

```sql
DROP DATABASE timesheet_management;
CREATE DATABASE timesheet_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

Then run `npm run db:migrate`. Never use this procedure in production.

## Production privileges

Use separate credentials where practical:

- migration identity: schema DDL plus data access;
- runtime identity: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and only required routines.

Back up before every production migration. A basic logical backup is:

```bash
mysqldump --single-transaction --routines --triggers timesheet_management > timesheet_backup.sql
```

Restore into an empty database with `mysql timesheet_management < timesheet_backup.sql` after validating the target and backup file.
