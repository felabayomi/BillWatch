import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';

// Application timezone - Mountain Time
export const APP_TIMEZONE = 'America/Denver';

/**
 * Get the current date in Mountain Time
 */
export function nowInMountainTime(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/**
 * Get today's date range in Mountain Time, converted to UTC for API calls
 */
export function dayRangeUtc(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const mtDate = toZonedTime(referenceDate, APP_TIMEZONE);
  const startOfDayMT = startOfDay(mtDate);
  const endOfDayMT = endOfDay(mtDate);
  
  return {
    startDate: fromZonedTime(startOfDayMT, APP_TIMEZONE),
    endDate: fromZonedTime(endOfDayMT, APP_TIMEZONE)
  };
}

/**
 * Get this week's date range in Mountain Time, converted to UTC for API calls
 */
export function weekRangeUtc(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const mtDate = toZonedTime(referenceDate, APP_TIMEZONE);
  const startOfWeekMT = startOfWeek(mtDate, { weekStartsOn: 0 }); // Sunday start
  const endOfWeekMT = endOfWeek(mtDate, { weekStartsOn: 0 });
  
  return {
    startDate: fromZonedTime(startOfWeekMT, APP_TIMEZONE),
    endDate: fromZonedTime(endOfWeekMT, APP_TIMEZONE)
  };
}

/**
 * Get the last 2 weeks date range in Mountain Time, converted to UTC for API calls
 */
export function biweekRangeUtc(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const mtDate = toZonedTime(referenceDate, APP_TIMEZONE);
  const twoWeeksAgoMT = subDays(startOfDay(mtDate), 13); // 14 days including today
  const endOfTodayMT = endOfDay(mtDate);
  
  return {
    startDate: fromZonedTime(twoWeeksAgoMT, APP_TIMEZONE),
    endDate: fromZonedTime(endOfTodayMT, APP_TIMEZONE)
  };
}

/**
 * Get this month's date range in Mountain Time, converted to UTC for API calls
 */
export function monthRangeUtc(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const mtDate = toZonedTime(referenceDate, APP_TIMEZONE);
  const startOfMonthMT = startOfMonth(mtDate);
  const endOfMonthMT = endOfMonth(mtDate);
  
  return {
    startDate: fromZonedTime(startOfMonthMT, APP_TIMEZONE),
    endDate: fromZonedTime(endOfMonthMT, APP_TIMEZONE)
  };
}

/**
 * Get this year's date range in Mountain Time, converted to UTC for API calls
 */
export function yearRangeUtc(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const mtDate = toZonedTime(referenceDate, APP_TIMEZONE);
  const startOfYearMT = startOfYear(mtDate);
  const endOfYearMT = endOfYear(mtDate);
  
  return {
    startDate: fromZonedTime(startOfYearMT, APP_TIMEZONE),
    endDate: fromZonedTime(endOfYearMT, APP_TIMEZONE)
  };
}

// Legacy compatibility functions
export const MOUNTAIN_TIMEZONE = APP_TIMEZONE;

export function toMountainTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(d, APP_TIMEZONE);
}

export function formatMountainTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  
  return d.toLocaleString("en-US", { ...defaultOptions, ...options });
}

export function formatMountainDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  const mtDate = toMountainTime(d);
  const mtToday = toMountainTime(today);
  
  return mtDate.toDateString() === mtToday.toDateString();
}

export function isYesterday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const mtDate = toMountainTime(d);
  const mtYesterday = toMountainTime(yesterday);
  
  return mtDate.toDateString() === mtYesterday.toDateString();
}

export function getRelativeDateString(date: Date | string): string {
  if (isToday(date)) {
    return formatMountainTime(date, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  
  if (isYesterday(date)) {
    return `Yesterday, ${formatMountainTime(date, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) {
    return formatMountainTime(date, { 
      weekday: 'short', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }
  
  return formatMountainDate(date);
}
