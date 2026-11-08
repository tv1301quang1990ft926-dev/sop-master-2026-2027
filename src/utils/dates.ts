export function getVietnamDateKey(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    // UTC+7 offset in ms = 7 * 3600 * 1000
    const vnMs = d.getTime() + (7 * 3600 * 1000);
    const vnDate = new Date(vnMs);
    return vnDate.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function formatGmtTime(dateStr: string | undefined, targetGmt: number = 7): string {
  if (!dateStr) return '22:00';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
    const targetMs = utcMs + (targetGmt * 3600000);
    const targetDate = new Date(targetMs);
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const mins = String(targetDate.getMinutes()).padStart(2, '0');
    const gmtSign = targetGmt >= 0 ? `+${targetGmt}` : `${targetGmt}`;
    return `${hours}:${mins} (GMT${gmtSign})`;
  } catch {
    return dateStr;
  }
}