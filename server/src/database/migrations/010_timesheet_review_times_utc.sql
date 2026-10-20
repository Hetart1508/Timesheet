-- Align review creation timestamps with the parent timesheet reviewed_at timestamp when available.
UPDATE timesheet_reviews tr
JOIN timesheets t ON t.id = tr.timesheet_id
SET tr.created_at = t.reviewed_at
WHERE t.reviewed_at IS NOT NULL AND tr.created_at > t.reviewed_at;
