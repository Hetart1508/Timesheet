CREATE TABLE timesheet_confirmation_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timesheet_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  responded_at DATETIME(6) NULL,
  response ENUM('YES', 'NO') NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_timesheet_confirmation_token (token_hash),
  KEY idx_timesheet_confirmation_lookup (timesheet_id, responded_at, expires_at),
  CONSTRAINT fk_timesheet_confirmation_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_timesheet_confirmation_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

UPDATE auth_sessions s
JOIN users u ON u.id = s.user_id
SET s.revoked_at = UTC_TIMESTAMP(6)
WHERE u.role = 'AGENT' AND s.revoked_at IS NULL;

UPDATE auth_sessions s
JOIN users u ON u.id = s.user_id
SET s.active_role = 'ADMIN'
WHERE u.role = 'ADMIN';
