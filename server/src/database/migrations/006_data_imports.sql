CREATE TABLE data_imports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  imported_by BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  row_count INT UNSIGNED NOT NULL,
  timesheet_count INT UNSIGNED NOT NULL,
  visit_count INT UNSIGNED NOT NULL,
  company_count INT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_data_imports_file_sha256 (file_sha256),
  KEY idx_data_imports_created_at (created_at),
  CONSTRAINT fk_data_imports_user FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
