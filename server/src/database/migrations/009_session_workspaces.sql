ALTER TABLE auth_sessions
  ADD COLUMN active_role ENUM('ADMIN', 'AGENT') NULL AFTER user_id;

UPDATE auth_sessions s
JOIN users u ON u.id = s.user_id
SET s.active_role = u.role
WHERE s.active_role IS NULL;

ALTER TABLE auth_sessions
  MODIFY COLUMN active_role ENUM('ADMIN', 'AGENT') NOT NULL;
