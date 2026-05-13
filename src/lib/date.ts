import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Mexico_City';

/**
 * Gets the current date in Mexico City timezone as YYYY-MM-DD
 */
export function getCurrentLocalDate(): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Formats a YYYY-MM-DD string into a human readable format
 * e.g. "miércoles, 13 de mayo"
 */
export function formatLocalDate(dateStr: string, pattern: string = "EEEE, d 'de' MMMM"): string {
  // Use parseISO to avoid timezone shifts from new Date(dateStr)
  const date = parseISO(dateStr);
  return format(date, pattern, { locale: es });
}

/**
 * Standardizes a date object or string into Mexico City YYYY-MM-DD
 */
export function toLocalDateString(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(d, TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Returns a date object representing the YYYY-MM-DD string as if it were local noon
 * to avoid edge-case shifts during formattings.
 */
export function getSafeLocalDate(dateStr: string): Date {
  return parseISO(dateStr);
}
