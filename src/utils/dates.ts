const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function getVietnamDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function formatDateTimeParts(iso: string, timeZone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
}

export function formatKickoffDateTime(iso: string): string {
  const parts = formatDateTimeParts(iso, VIETNAM_TIME_ZONE);
  return `${parts.day}/${parts.month} - ${parts.hour}:${parts.minute}`;
}

export function formatHistoryDate(value: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const parts = formatDateTimeParts(iso, 'UTC');
  return `${parts.day}/${parts.month}/${parts.year}`;
}
