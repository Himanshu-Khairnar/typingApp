/**
 * `streaks.current_streak` is only recalculated when a new result is saved,
 * so a streak that lapsed days ago would still show as active. A streak is
 * alive only if the last test was today or yesterday (UTC, matching the DB's
 * `current_date`).
 */
export function effectiveStreak(current: number | null | undefined, lastTestDate: string | null | undefined): number {
  if (!current || !lastTestDate) return 0;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  const last = lastTestDate.slice(0, 10);
  return last === todayStr || last === yesterday ? current : 0;
}
