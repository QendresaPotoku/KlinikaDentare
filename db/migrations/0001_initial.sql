-- Booking system: initial schema. Requires PostgreSQL 15+ (UNIQUE NULLS NOT DISTINCT) and the
-- standard btree_gist extension (available on every managed Postgres: Neon, Supabase, Railway, RDS…).
--
-- Conventions
--   * Instants are timestamptz (stored as UTC). Clinic wall-clock times (weekly schedules, special
--     hours) are minutes since local midnight (0–1440) and are converted per date in Kosovo time
--     (Europe/Belgrade) by the application, so daylight-saving changes stay correct.
--   * Rows with history are never deleted: doctors and services are deactivated, appointments are
--     cancelled. Foreign keys from appointments use ON DELETE RESTRICT to enforce this.
--   * Status-like columns are text + CHECK rather than enum types, so values can be added later
--     with a simple constraint change.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------- staff accounts

CREATE TABLE admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%'),
  name          text NOT NULL CHECK (btrim(name) <> ''),
  password_hash text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_email_key UNIQUE (email)
);

-- Only a hash of the session token is stored; the raw token lives in the HttpOnly cookie.
CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id    uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip         text,
  user_agent text
);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- ---------------------------------------------------------------- doctors and services

CREATE TABLE doctors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL CHECK (btrim(name) <> ''),
  active         boolean NOT NULL DEFAULT true,
  accepts_online boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- English and German names are optional; the Albanian name is the fallback.
CREATE TABLE services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_sq        text NOT NULL CHECK (btrim(name_sq) <> ''),
  name_en        text CHECK (name_en IS NULL OR btrim(name_en) <> ''),
  name_de        text CHECK (name_de IS NULL OR btrim(name_de) <> ''),
  duration_min   integer NOT NULL CHECK (duration_min BETWEEN 5 AND 720 AND duration_min % 5 = 0),
  active         boolean NOT NULL DEFAULT true,
  -- New services are hidden from the public site until staff switch them on.
  online_visible boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE doctor_services (
  doctor_id  uuid NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, service_id)
);
CREATE INDEX doctor_services_service_idx ON doctor_services (service_id);

-- ---------------------------------------------------------------- working time

-- Regular weekly hours. Several rows per doctor and weekday give split shifts and breaks.
-- A doctor with no rows has no online availability (nothing is assumed).
CREATE TABLE weekly_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    uuid NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  weekday      smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- ISO 8601: 1 = Monday … 7 = Sunday
  start_minute smallint NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute   smallint NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (start_minute < end_minute),
  CONSTRAINT weekly_schedules_no_overlap
    EXCLUDE USING gist (doctor_id WITH =, weekday WITH =, int4range(start_minute, end_minute) WITH &&)
);

-- Absences (vacation, sick leave, …). Full days are stored as local midnight to local midnight.
CREATE TABLE time_off (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  uuid NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  all_day    boolean NOT NULL DEFAULT false,
  reason     text NOT NULL CHECK (reason IN ('vacation', 'sick', 'training', 'personal', 'other')),
  note       text,
  created_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at)
);
CREATE INDEX time_off_doctor_range_idx ON time_off USING gist (doctor_id, tstzrange(starts_at, ends_at, '[)'));

-- One-off changes for a single date.
--   doctor_id NULL  = whole clinic: 'closed' closes everyone; 'custom_hours' limits everyone to those hours.
--   doctor_id set   = that doctor: 'closed' = day off; 'custom_hours' replaces their weekly hours that day
--                     (also used for exceptional working days).
CREATE TABLE date_overrides (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date NOT NULL,
  doctor_id  uuid REFERENCES doctors (id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('closed', 'custom_hours')),
  note       text,
  created_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT date_overrides_one_per_scope UNIQUE NULLS NOT DISTINCT (date, doctor_id)
);

CREATE TABLE date_override_periods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id  uuid NOT NULL REFERENCES date_overrides (id) ON DELETE CASCADE,
  start_minute smallint NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute   smallint NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  CHECK (start_minute < end_minute),
  CONSTRAINT date_override_periods_no_overlap
    EXCLUDE USING gist (override_id WITH =, int4range(start_minute, end_minute) WITH &&)
);

-- ---------------------------------------------------------------- appointments

CREATE TABLE appointments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             uuid NOT NULL REFERENCES doctors (id) ON DELETE RESTRICT,
  service_id            uuid NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  -- Albanian service name at booking time, so history reads correctly after a service is renamed.
  service_name_snapshot text NOT NULL,
  -- The end is stored, not derived: changing a service's duration never moves existing appointments.
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  source                text NOT NULL CHECK (source IN ('online', 'staff')),
  patient_name          text NOT NULL CHECK (btrim(patient_name) <> '' AND length(patient_name) <= 200),
  -- E.164, e.g. +38344123456
  patient_phone         text NOT NULL CHECK (patient_phone ~ '^\+[1-9][0-9]{6,14}$'),
  patient_email         text CHECK (patient_email IS NULL OR (length(patient_email) <= 254 AND patient_email LIKE '%_@_%')),
  patient_note          text CHECK (patient_note IS NULL OR length(patient_note) <= 2000),
  staff_note            text,
  -- Language the patient booked in; used for all notifications to them.
  lang                  text NOT NULL CHECK (lang IN ('sq', 'en', 'de')),
  -- Hash of the secret in the patient's cancellation link.
  manage_token_hash     text UNIQUE,
  -- Sent by the booking form once per attempt; a repeated submit returns the same appointment.
  idempotency_key       text UNIQUE,
  created_by            uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  cancelled_at          timestamptz,
  cancelled_by_type     text CHECK (cancelled_by_type IN ('staff', 'patient')),
  cancelled_by          uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  cancel_reason         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  -- The hard rule: two active appointments of the same doctor can never overlap.
  -- '[)' ranges let one appointment end exactly when the next starts. Cancelled rows release the time.
  CONSTRAINT appointments_no_overlap
    EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status <> 'cancelled')
);
CREATE INDEX appointments_starts_at_idx ON appointments (starts_at);
CREATE INDEX appointments_patient_phone_idx ON appointments (patient_phone);

CREATE TABLE appointment_events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES appointments (id) ON DELETE RESTRICT,
  type           text NOT NULL CHECK (type IN ('created', 'rescheduled', 'cancelled', 'status_changed', 'edited')),
  actor_type     text NOT NULL CHECK (actor_type IN ('staff', 'patient', 'system')),
  actor_user_id  uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  from_starts_at timestamptz,
  to_starts_at   timestamptz,
  from_doctor_id uuid REFERENCES doctors (id) ON DELETE RESTRICT,
  to_doctor_id   uuid REFERENCES doctors (id) ON DELETE RESTRICT,
  from_status    text,
  to_status      text,
  details        jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointment_events_appointment_idx ON appointment_events (appointment_id, created_at);

-- ---------------------------------------------------------------- settings

-- Exactly one row. Online booking starts switched OFF: the clinic turns it on in the admin panel once
-- doctors' schedules and services are configured.
CREATE TABLE settings (
  id                    smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  online_enabled        boolean NOT NULL DEFAULT false,
  disabled_message_sq   text NOT NULL,
  disabled_message_en   text NOT NULL,
  disabled_message_de   text NOT NULL,
  booking_window_days   integer NOT NULL DEFAULT 90 CHECK (booking_window_days BETWEEN 1 AND 365),
  min_notice_minutes    integer NOT NULL DEFAULT 120 CHECK (min_notice_minutes BETWEEN 0 AND 20160),
  cancel_deadline_hours integer NOT NULL DEFAULT 24 CHECK (cancel_deadline_hours BETWEEN 0 AND 336),
  slot_step_minutes     integer NOT NULL DEFAULT 15 CHECK (slot_step_minutes IN (5, 10, 15, 20, 30, 60)),
  email_required        boolean NOT NULL DEFAULT true,
  clinic_notify_email   text CHECK (clinic_notify_email IS NULL OR clinic_notify_email LIKE '%_@_%'),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES admin_users (id) ON DELETE SET NULL
);

INSERT INTO settings (id, disabled_message_sq, disabled_message_en, disabled_message_de) VALUES (
  1,
  'Rezervimi online nuk është i disponueshëm për momentin. Ju lutemi na kontaktoni me telefon ose WhatsApp për të caktuar një termin.',
  'Online booking is currently unavailable. Please contact us by phone or WhatsApp to book an appointment.',
  'Die Online-Terminbuchung ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns telefonisch oder per WhatsApp, um einen Termin zu vereinbaren.'
);

-- ---------------------------------------------------------------- notifications outbox

-- Provider-independent outbox. Rows are written in the same transaction as the booking change and
-- sent afterwards by a dispatcher (email now; SMS reminders later via scheduled_for).
CREATE TABLE notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      uuid REFERENCES appointments (id) ON DELETE RESTRICT,
  channel             text NOT NULL CHECK (channel IN ('email', 'sms')),
  type                text NOT NULL CHECK (type IN ('confirmation', 'rescheduled', 'cancelled', 'clinic_new_booking', 'reminder')),
  recipient           text NOT NULL,
  lang                text NOT NULL CHECK (lang IN ('sq', 'en', 'de')),
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for       timestamptz NOT NULL DEFAULT now(),
  attempts            integer NOT NULL DEFAULT 0,
  last_error          text,
  provider            text,
  provider_message_id text,
  payload             jsonb NOT NULL DEFAULT '{}',
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_due_idx ON notifications (scheduled_for) WHERE status = 'pending';
CREATE INDEX notifications_appointment_idx ON notifications (appointment_id);

-- ---------------------------------------------------------------- spam protection

-- Fixed-window counters (per IP, per phone number…). Stored in the database so limits hold across
-- server restarts and multiple instances.
CREATE TABLE rate_limits (
  key          text NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX rate_limits_window_idx ON rate_limits (window_start);

-- ---------------------------------------------------------------- updated_at triggers

CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER weekly_schedules_updated_at BEFORE UPDATE ON weekly_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER time_off_updated_at BEFORE UPDATE ON time_off FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER date_overrides_updated_at BEFORE UPDATE ON date_overrides FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
