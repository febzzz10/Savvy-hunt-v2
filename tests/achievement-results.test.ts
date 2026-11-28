import { describe, expect, it } from "vitest";
import { achievementWinners, orderByPlacement } from "../lib/achievement-results";

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

describe("result placement order", () => {
  const school = (schoolName: string) => ({ schoolId: schoolName, schoolName });

  it("groups tied placements in ascending order without dropping rows or changing points", () => {
    const entries = [
      { ...school("Beta"), placement: 2, points: 5 },
      { ...school("Alpha"), placement: 1, points: 9 },
      { ...school("Gamma"), placement: 1, points: 9 },
      { ...school("Delta"), placement: 3, points: 2 },
      { ...school("Epsilon"), placement: 2, points: 5 },
      { ...school("Zeta"), placement: 3, points: 2 },
    ];
    const ordered = orderByPlacement(entries);
    expect(ordered.map(row => row.placement)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(ordered.map(row => row.schoolName)).toEqual(["Alpha", "Gamma", "Beta", "Epsilon", "Delta", "Zeta"]);
    expect(ordered.map(row => row.points)).toEqual([9, 9, 5, 5, 2, 2]);
    expect(ordered).toHaveLength(entries.length);
  });

  it("orders each event's entries independently and keeps placement-less rows last", () => {
    const first = [{ ...school("B"), placement: 2, points: 1 }, { ...school("A"), placement: 1, points: 4 }];
    const second = [{ ...school("C"), points: 0, placement: undefined }, { ...school("D"), placement: 1, points: 7 }];
    expect(orderByPlacement(first).map(row => row.placement)).toEqual([1, 2]);
    expect(orderByPlacement(second).map(row => row.placement)).toEqual([1, undefined]);
  });

  it("breaks a placement tie by school then student without inventing a placement", () => {
    const ordered = orderByPlacement([
      { ...school("Alpha"), placement: 1, participantName: "Zara" },
      { ...school("Alpha"), placement: 1, participantName: "Asha" },
      { ...school("Beta"), placement: 1, participantName: "Mia" },
    ]);
    expect(ordered.map(row => `${row.schoolName}/${row.participantName}`)).toEqual(["Alpha/Asha", "Alpha/Zara", "Beta/Mia"]);
    expect(ordered.every(row => row.placement === 1)).toBe(true);
  });
});
