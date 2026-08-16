export function formatLBP(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.abs(num));
  return `${num < 0 ? '-' : ''}${formatted} LBP`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
