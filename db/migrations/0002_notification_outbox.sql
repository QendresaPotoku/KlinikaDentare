-- Notification outbox, completed for real delivery (Phase 5).
--
-- Each row is ONE logical message about ONE appointment event (the appointment_events row in
-- event_id). Its content comes from `payload`, a snapshot taken when the event happened, never
-- from whatever the appointment looks like at send time. dedupe_key makes queueing idempotent.
--
-- Lifecycle: pending → sending (claimed by one dispatcher, with a lease) → sent | failed | skipped.
-- A failed attempt with a temporary error goes back to pending with a later scheduled_for.
-- skipped = intentionally not sent (superseded by a later event, appointment no longer matching…).

ALTER TABLE notifications DROP CONSTRAINT notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped'));

ALTER TABLE notifications
  ADD COLUMN event_id     bigint REFERENCES appointment_events (id) ON DELETE RESTRICT,
  ADD COLUMN dedupe_key   text,
  -- Claim of the dispatcher currently sending it; an expired lease can be taken over.
  ADD COLUMN claim_token  uuid,
  ADD COLUMN locked_until timestamptz,
  ADD COLUMN max_attempts integer NOT NULL DEFAULT 6 CHECK (max_attempts BETWEEN 1 AND 20),
  ADD COLUMN failure_kind text CHECK (failure_kind IN ('permanent', 'temporary')),
  ADD COLUMN skip_reason  text;

ALTER TABLE notifications ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);

DROP INDEX notifications_due_idx;
CREATE INDEX notifications_due_idx ON notifications (scheduled_for) WHERE status IN ('pending', 'sending');
