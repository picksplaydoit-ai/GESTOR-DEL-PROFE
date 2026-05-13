import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, setMonth, setQuarter, getYear } from 'date-fns';
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

/**
 * Gets the date range for a specific month
 */
export function getMonthRange(year: number, month: number) {
  const baseDate = new Date(year, month, 1);
  return {
    startDate: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(baseDate), 'yyyy-MM-dd')
  };
}

/**
 * Gets the date range for a specific quarter (1-4)
 */
export function getQuarterRange(year: number, quarter: number) {
  const baseDate = setQuarter(new Date(year, 0, 1), quarter);
  return {
    startDate: format(startOfQuarter(baseDate), 'yyyy-MM-dd'),
    endDate: format(endOfQuarter(baseDate), 'yyyy-MM-dd')
  };
}

/**
 * Gets the month name in Spanish
 */
export function getMonthName(month: number): string {
  return format(new Date(2000, month, 1), 'MMMM', { locale: es });
}
