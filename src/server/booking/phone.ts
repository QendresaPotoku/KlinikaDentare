import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export interface ParsedPhone {
  /** E.164, e.g. +38344123456 */
  e164: string;
  /** Number type as detected by libphonenumber; undefined when it cannot tell. */
  type: string | undefined;
}

/**
 * Parses what a patient typed. Numbers without a "+" or "00" prefix are read as `defaultCountry`
 * (Kosovo unless the form says otherwise). Returns null for anything that is not a valid number.
 */
export function parsePhone(input: string, defaultCountry: CountryCode = 'XK'): ParsedPhone | null {
  const cleaned = input.trim().replace(/^00/, '+');
  if (!cleaned || cleaned.length > 32) return null;
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return { e164: parsed.number, type: parsed.getType() };
}

/** E.164 or null; see parsePhone. */
export function normalizePhone(input: string, defaultCountry: CountryCode = 'XK'): string | null {
  return parsePhone(input, defaultCountry)?.e164 ?? null;
}

/**
 * True only when the number is positively identified as a landline. Numbers whose type cannot be
 * determined reliably (FIXED_LINE_OR_MOBILE, unknown) are not treated as landlines.
 * The same rule will later decide SMS eligibility (non-landline + not unknown → SMS).
 */
export function isLandline(phone: ParsedPhone): boolean {
  return phone.type === 'FIXED_LINE';
}

export function isCountryCode(value: string): value is CountryCode {
  return (getCountries() as string[]).includes(value);
}

/** Every country the phone library knows, with its calling code, for the booking form. */
export function phoneCountries(): { code: CountryCode; dial: string }[] {
  return getCountries().map((code) => ({ code, dial: getCountryCallingCode(code) }));
}

/** "+383 44 123 456" for display; falls back to the stored value. */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
