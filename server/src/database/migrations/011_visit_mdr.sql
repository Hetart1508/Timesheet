ALTER TABLE visits
  ADD COLUMN mdr ENUM('Level 1', 'Level 2', 'Level 3') NOT NULL DEFAULT 'Level 1' AFTER category;
