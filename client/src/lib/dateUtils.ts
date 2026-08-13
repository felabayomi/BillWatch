// Utility for parsing dates consistently across the app to avoid UTC conversion issues

export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // If it's in YYYY-MM-DD format, parse manually to avoid UTC conversion
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // For other formats, use normal parsing
  return new Date(dateString);
}