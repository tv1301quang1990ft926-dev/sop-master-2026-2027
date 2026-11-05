const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function getTodayRangeGmt7(now: Date = new Date()): { start: string; end: string } {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const start = new Date(`${day}T00:00:00+07:00`);
  const end = new Date(`${day}T23:59:59+07:00`);

  return { start: start.toISOString(), end: end.toISOString() };
}
