// Fractional minutes are preserved; this formatter does not silently round them.
export function formatDuration(durationMinutes: number): string {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new RangeError("Duration must be finite and non-negative.");
  }
  const hours: number = Math.floor(durationMinutes / 60);
  const minutes: number = durationMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
