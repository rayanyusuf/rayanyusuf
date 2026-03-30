/**
 * Strip to digits only for wa.me (E.164 without +).
 * Accepts e.g. "+47 466 77 978" or "4746677978".
 */
export function normalizeWhatsAppE164(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildEarlyAccessWhatsAppUrl(
  phoneE164Digits: string,
  fields: {
    name: string;
    dateOfBirth: string;
    school: string;
  }
): string {
  const text = `Hi, I'm requesting early access to PastPaperLab.

Name: ${fields.name}
Date of birth: ${fields.dateOfBirth}
School: ${fields.school}`;

  return `https://wa.me/${phoneE164Digits}?text=${encodeURIComponent(text)}`;
}
