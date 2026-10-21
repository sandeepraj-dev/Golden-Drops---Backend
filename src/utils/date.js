export function startOfBusinessDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
export function validateDateRange(from, to) {
  const start = from ? new Date(from) : undefined;
  const end = to ? new Date(to) : undefined;
  if (start && Number.isNaN(start.getTime())) throw new Error("Invalid from date");
  if (end && Number.isNaN(end.getTime())) throw new Error("Invalid to date");
  if (start && end && start > end) throw new Error("'from' must be before or equal to 'to'");
  return { start, end };
}
