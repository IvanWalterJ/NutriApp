/**
 * Returns a finite number from any input, or null.
 * Accepts numbers and numeric strings; rejects null, undefined, "", NaN, Infinity.
 *
 * Why: Supabase/Excel data can come back as strings or NaN; aggregations that
 * skip validation produce absurd values (e.g. weight loss of 700 kg).
 */
export function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Same as toNumOrNull but with a fallback value when not a finite number. */
export function toNumOr<T>(v: unknown, fallback: T): number | T {
  const n = toNumOrNull(v);
  return n === null ? fallback : n;
}
