import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const digitsOf = (value: string) => value.replace(/\D/g, '');

function asCountry(hint: string | undefined): CountryCode | undefined {
  return hint && /^[A-Za-z]{2}$/.test(hint) ? (hint.toUpperCase() as CountryCode) : undefined;
}

// A phone or WhatsApp number in E.164 (+62…). Without a country code, the
// country comes from the hint (the JSON-LD address); a number that still
// can't be read is kept as written. Null under 6 digits.
export function toE164(raw: string, countryHint?: string): string | null {
  const written = raw.trim();
  const digits = digitsOf(written);
  if (digits.length < 6) return null;
  const international = written.startsWith('+')
    ? written
    : written.startsWith('00')
      ? `+${digits.slice(2)}`
      : null;
  if (international) {
    const parsed = parsePhoneNumberFromString(international);
    return parsed?.isPossible() ? parsed.number : `+${digitsOf(international)}`;
  }
  const country = asCountry(countryHint);
  if (country) {
    const parsed = parsePhoneNumberFromString(written, country);
    if (parsed?.isPossible()) return parsed.number;
  }
  // Digits without a leading 0 and long enough are taken as international
  // (wa.me links always carry the country code).
  if (!written.startsWith('0') && digits.length >= 10) {
    const parsed = parsePhoneNumberFromString(`+${digits}`);
    if (parsed?.isPossible()) return parsed.number;
  }
  return written;
}

// The digit strings a page may show for a number: all its digits, and the
// national number (shown with a leading 0 on local sites).
export function phoneDigitVariants(value: string): string[] {
  const digits = digitsOf(value);
  const variants = [digits];
  const parsed = value.trim().startsWith('+')
    ? parsePhoneNumberFromString(value.trim())
    : undefined;
  if (parsed && parsed.nationalNumber !== digits) variants.push(parsed.nationalNumber);
  return variants;
}
