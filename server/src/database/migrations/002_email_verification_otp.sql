ALTER TABLE email_verification_tokens
  ADD COLUMN attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER consumed_at;
