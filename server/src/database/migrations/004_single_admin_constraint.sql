ALTER TABLE users
  ADD COLUMN admin_singleton TINYINT
    GENERATED ALWAYS AS (CASE WHEN role = 'ADMIN' THEN 1 ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_users_single_admin (admin_singleton);
