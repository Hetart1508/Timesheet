ALTER TABLE visits
  ADD COLUMN category ENUM('Gold', 'Silver', 'Bronze') NOT NULL DEFAULT 'Silver' AFTER company_name_snapshot;