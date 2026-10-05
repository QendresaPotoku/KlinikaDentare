/** Expected, user-facing booking failures. Anything else is a bug and surfaces as a 500. */
export type BookingErrorCode =
  | 'invalid_input'
  | 'invalid_phone'
  /** Online bookings need a number that can receive SMS; this one is a known landline. */
  | 'phone_landline'
  | 'email_required'
  | 'online_disabled'
  | 'service_unavailable'
  | 'doctor_unavailable'
  | 'doctor_not_offering_service'
  /** Online: the time is no longer offered ("This time was just booked…"). */
  | 'slot_unavailable'
  /** Staff: the time overlaps another active appointment of the doctor. Never overridable. */
  | 'appointment_conflict'
  /** Staff: outside working hours / time off / clinic closed, and no override was given. */
  | 'working_rules'
  | 'in_past'
  | 'not_found'
  | 'invalid_status'
  | 'cancel_deadline_passed'
  /** The same duplicate-submit key was reused for a different booking. */
  | 'idempotency_conflict'
  /** The appointment changed while this request was being processed; retry. */
  | 'concurrent_change';

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  readonly details?: unknown;

  constructor(code: BookingErrorCode, details?: unknown) {
    super(code);
    this.name = 'BookingError';
    this.code = code;
    this.details = details;
  }
}

/** Postgres error helpers. */
export function pgCode(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
}

export function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint_name?: string } | null)?.constraint_name;
}

export const EXCLUSION_VIOLATION = '23P01';
export const UNIQUE_VIOLATION = '23505';
