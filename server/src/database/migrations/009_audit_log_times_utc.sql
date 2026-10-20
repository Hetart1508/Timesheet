-- Audit rows historically used CURRENT_TIMESTAMP, which follows the MySQL session timezone.
-- DATETIME values are read by the application as UTC, so remove the server's current UTC
-- offset once. The expression is a no-op on databases whose session timezone is already UTC.
UPDATE audit_logs
SET created_at = DATE_SUB(created_at, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
