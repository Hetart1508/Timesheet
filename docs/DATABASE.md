# Database design

MySQL is the source of truth. Timestamps are stored as UTC `DATETIME(6)` values; business-date parsing and display use `Asia/Kolkata` by default.

## Migration policy

SQL files in `server/src/database/migrations` are applied in lexical order. Applied filenames are recorded in `schema_migrations`. Production application startup never mutates the schema automatically.

The initial migration contains:

- users and stable role/status constraints;
- hashed, expiring, single-use verification and password-reset tokens;
- opaque refresh-session hashes with rotation/reuse-detection support;
- canonical companies with Agent-created review state;
- one timesheet per Agent and business date;
- soft-deletable visits with company-name snapshots and positive-duration constraints;
- append-only review and audit history;
- a persistent notification outbox.

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
