ALTER TABLE users
  ADD COLUMN deleted_at DATETIME(6) NULL AFTER updated_at;

CREATE INDEX idx_users_role_deleted_status
  ON users (role, deleted_at, status);
