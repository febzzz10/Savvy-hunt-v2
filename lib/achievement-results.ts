export type AchievementEntry = {
  schoolId: string;
  schoolName: string;
  points?: number;
  placement?: number;
  participantName?: string;
};

export type AchievementResult = {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  categoryId: string;
  publishedAt: number;
  entries: AchievementEntry[];
};

/** Display order only: ascending official placement, then school, then student. Entries without a placement sort last. */
export function orderByPlacement<T extends { schoolName: string; placement?: number; participantName?: string }>(entries: T[]) {
  const place = (entry: { placement?: number }) => entry.placement ?? Number.MAX_SAFE_INTEGER;
  return [...entries].sort((a, b) => place(a) - place(b) || a.schoolName.localeCompare(b.schoolName) || (a.participantName ?? "").localeCompare(b.participantName ?? ""));
}

/** Placements are explicit awards, never inferred from points or array order. */
export function achievementWinners(entries: AchievementEntry[]) {
  return entries
    .filter((entry): entry is AchievementEntry & { placement: number } =>
      entry.placement !== undefined && Number.isInteger(entry.placement) && entry.placement >= 1 && entry.placement <= 3)
    .sort((a, b) => a.placement - b.placement)
    .map(entry => ({
      ...entry,
      placeLabel: `${["", "1st", "2nd", "3rd"][entry.placement]} Place`,
      tied: entries.filter(other => other.placement === entry.placement).length > 1,
    }));
}
