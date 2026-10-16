CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL,
  username_normalized VARCHAR(60) NOT NULL,
  email VARCHAR(254) NOT NULL,
  email_normalized VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'AGENT') NOT NULL DEFAULT 'AGENT',
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  last_login_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username_normalized (username_normalized),
  UNIQUE KEY uq_users_email_normalized (email_normalized),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE email_verification_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_token_hash (token_hash),
  KEY idx_email_verification_user (user_id, consumed_at, expires_at),
  CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user (user_id, consumed_at, expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE auth_sessions (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  previous_token_hash CHAR(64) NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_used_at DATETIME(6) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_refresh_hash (refresh_token_hash),
  KEY idx_auth_sessions_user_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name VARCHAR(180) NOT NULL,
  company_name_normalized VARCHAR(180) NOT NULL,
  address VARCHAR(500) NOT NULL,
  contact_person VARCHAR(120) NULL,
  contact_phone VARCHAR(30) NULL,
  notes TEXT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  review_status ENUM('APPROVED', 'PENDING') NOT NULL DEFAULT 'APPROVED',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_companies_lookup (status, company_name_normalized),
  KEY idx_companies_review (review_status, created_at),
  CONSTRAINT fk_companies_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE timesheets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  daily_summary TEXT NULL,
  status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED') NOT NULL DEFAULT 'DRAFT',
  submitted_at DATETIME(6) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(6) NULL,
  review_comment TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_timesheets_agent_date (agent_id, work_date),
  KEY idx_timesheets_status_date (status, work_date),
  KEY idx_timesheets_reviewed_by (reviewed_by),
  CONSTRAINT fk_timesheets_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_timesheets_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE visits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timesheet_id BIGINT UNSIGNED NOT NULL,
  company_id BIGINT UNSIGNED NULL,
  company_name_snapshot VARCHAR(180) NOT NULL,
  contact_person VARCHAR(120) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  visit_notes TEXT NOT NULL,
  check_in_at DATETIME(6) NOT NULL,
  check_out_at DATETIME(6) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  deleted_at DATETIME(6) NULL,
  deleted_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_visits_timesheet_active (timesheet_id, deleted_at, check_in_at),
  KEY idx_visits_company_date (company_id, check_in_at),
  CONSTRAINT chk_visits_positive_duration CHECK (check_out_at > check_in_at),
  CONSTRAINT fk_visits_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_visits_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE timesheet_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timesheet_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  decision ENUM('APPROVED', 'REJECTED', 'CHANGES_REQUESTED') NOT NULL,
  comment TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_reviews_timesheet_created (timesheet_id, created_at),
  CONSTRAINT fk_reviews_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_audit_actor_date (actor_user_id, created_at),
  KEY idx_audit_entity_date (entity_type, entity_id, created_at),
  KEY idx_audit_action_date (action, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient VARCHAR(254) NOT NULL,
  notification_type VARCHAR(80) NOT NULL,
  related_entity_type VARCHAR(80) NULL,
  related_entity_id VARCHAR(64) NULL,
  payload JSON NULL,
  status ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_error_summary VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  sent_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_delivery (status, next_attempt_at, attempt_count),
  KEY idx_notifications_related (related_entity_type, related_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
