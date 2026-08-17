export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC)
 * This prevents timezone shifting when displaying dates
 */
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * This ensures consistent date calculations across all balance queries
 */
export function getLocalISODate(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
}

export function getCurrencyColor(cents: number): string {
  if (cents > 0) return 'text-secondary';
  if (cents < 0) return 'text-destructive';
  return 'text-muted-foreground';
}

export function getAccountTypeIcon(type: string): string {
  switch (type) {
    case 'checking':
      return 'fas fa-university';
    case 'savings':
      return 'fas fa-piggy-bank';
    case 'credit':
      return 'fas fa-credit-card';
    case 'cash':
      return 'fas fa-wallet';
    case 'investment':
      return 'fas fa-chart-line';
    case 'loan':
      return 'fas fa-handshake';
    case 'mortgage':
      return 'fas fa-home';
    case 'auto_loan':
      return 'fas fa-car';
    case 'student_loan':
      return 'fas fa-graduation-cap';
    case 'heloc':
      return 'fas fa-home-user';
    case 'business_loan':
      return 'fas fa-briefcase';
    default:
      return 'fas fa-circle';
  }
}

export function getCategoryColor(kind: string): string {
  switch (kind) {
    case 'income':
      return 'bg-secondary/10 text-secondary';
    case 'expense':
      return 'bg-chart-3/10 text-chart-3';
    case 'bill':
      return 'bg-destructive/10 text-destructive';
    case 'debt':
      return 'bg-destructive/10 text-destructive';
    case 'transfer':
      return 'bg-primary/10 text-primary';
    case 'investment':
      return 'bg-chart-4/10 text-chart-4';
    case 'adjustment':
      return 'bg-muted/50 text-muted-foreground';
    default:
      return 'bg-muted/50 text-muted-foreground';
  }
}
