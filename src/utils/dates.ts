const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function getTodayDateGmt7(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
