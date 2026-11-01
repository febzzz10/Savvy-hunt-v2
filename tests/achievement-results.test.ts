import { describe, expect, it } from "vitest";
import { achievementWinners } from "../lib/achievement-results";

describe("achievement podium mapping", () => {
  it("uses explicit placements, preserves ties and zero points, and never guesses ranks", () => {
    const school = { schoolId: "school", schoolName: "School" };
    const winners = achievementWinners([
      { ...school, placement: 3, points: 0 },
      { ...school, placement: 1, points: 10, participantName: "Approved name" },
      { ...school, placement: 1, points: 10 },
      { ...school, points: 100 },
      { ...school, placement: 4, points: 6 },
    ]);
    expect(winners.map(row => row.placement)).toEqual([1, 1, 3]);
    expect(winners.map(row => row.tied)).toEqual([true, true, false]);
    expect(winners[0].placeLabel).toBe("1st Place");
    expect(winners[2].points).toBe(0);
    expect(achievementWinners([])).toEqual([]);
  });
});
