CREATE TABLE admin_login_challenges (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_admin_login_user (user_id, consumed_at, expires_at),
  CONSTRAINT fk_admin_login_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
