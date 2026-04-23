// Utilidades de fecha para strings "YYYY-MM-DD" provenientes de columnas DATE
// de Postgres. El constructor `new Date("2026-04-10")` las interpreta como UTC
// medianoche, y al formatearlas en timezones al oeste de UTC (ej: Argentina)
// muestran un día antes. Estos helpers parsean y formatean en zona local.

export function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  if (s.includes('T')) return new Date(s);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatLocalDate(
  s: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
  locale: string = 'es-ES',
): string {
  const d = parseLocalDate(s);
  return d ? d.toLocaleDateString(locale, opts) : '';
}

// Devuelve la fecha actual en formato "YYYY-MM-DD" usando la zona horaria local
// del navegador (en contraste con `new Date().toISOString().split('T')[0]`, que
// se adelanta un día cuando el reloj UTC ya cruzó medianoche).
export function todayLocalISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
