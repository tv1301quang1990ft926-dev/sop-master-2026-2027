const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function getVietnamDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function formatKickoffTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
