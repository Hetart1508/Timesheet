CREATE TABLE agent_imports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  imported_by BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  row_count INT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_imports_file_sha256 (file_sha256),
  KEY idx_agent_imports_created_at (created_at),
  CONSTRAINT fk_agent_imports_user FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE agent_invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  import_id BIGINT UNSIGNED NOT NULL,
  invited_by BIGINT UNSIGNED NOT NULL,
  accepted_user_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  email_normalized VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NULL,
  expires_at DATETIME(6) NOT NULL,
  status ENUM('PENDING', 'SENT', 'FAILED', 'ACCEPTED') NOT NULL DEFAULT 'PENDING',
  sent_at DATETIME(6) NULL,
  accepted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_invitations_email (email_normalized),
  UNIQUE KEY uq_agent_invitations_token_hash (token_hash),
  KEY idx_agent_invitations_status (status, expires_at),
  CONSTRAINT fk_agent_invitations_import FOREIGN KEY (import_id) REFERENCES agent_imports(id) ON DELETE RESTRICT,
  CONSTRAINT fk_agent_invitations_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_agent_invitations_accepted_user FOREIGN KEY (accepted_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;