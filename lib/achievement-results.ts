export type AchievementEntry = {
  schoolId: string;
  schoolName: string;
  points?: number;
  placement?: number;
  entryLabel?: string;
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
