-- Patient notifications move from email to SMS.
--
-- Patients now get two SMS (booking confirmation, reminder about 24 h before); they get no email.
-- The clinic's internal email about new online bookings stays. The outbox itself is unchanged:
-- SMS rows use channel 'sms' with type 'confirmation' / 'reminder', the reminder via scheduled_for.

-- Patient emails queued before this change are not sent anymore.
UPDATE notifications SET status = 'skipped', skip_reason = 'patient_email_disabled'
WHERE channel = 'email' AND type IN ('confirmation', 'rescheduled', 'cancelled', 'reminder') AND status = 'pending';

-- The email address was required only so the confirmation email could be sent. It stays available
-- as an optional contact field; the clinic can still make it mandatory in the admin settings.
ALTER TABLE settings ALTER COLUMN email_required SET DEFAULT false;
UPDATE settings SET email_required = false;
