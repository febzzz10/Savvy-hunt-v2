import { describe, expect, it } from "vitest";
import { filterStandings, groupContributions, isMedal, isTied, pointsLabel, summarize, type Category, type Contribution, type Standing } from "../lib/scoreboard-inspector";

const standings: Standing[] = [
  { id: "a", name: "Alpha", points: 20, rank: 1 },
  { id: "b", name: "Beta", points: 20, rank: 1 },
  { id: "c", name: "Gamma", points: 5, rank: 3 },
  { id: "d", name: "Delta School", points: 0, rank: 4 },
];
const categories: Category[] = [{ _id: "c1", name: "Category I" }, { _id: "c2", name: "Category II" }, { _id: "common", name: "Common Category" }];
const contributions: Contribution[] = [
  { eventId: "e1", eventTitle: "Quiz", categoryId: "c2", points: 3 },
  { eventId: "e2", eventTitle: "Art", categoryId: "c1", points: 4 },
  { eventId: "e3", eventTitle: "Debate", categoryId: "c1", points: 9 },
];

describe("scoreboard inspector helpers", () => {
  it("filters by name case-insensitively and keeps official ranks", () => {
    expect(filterStandings(standings, "  gAm ")).toEqual([standings[2]]);
    expect(filterStandings(standings, "")).toBe(standings);
    expect(filterStandings(standings, "school")[0].rank).toBe(4);
  });

  it("lists every school sharing the top score as a leader", () => {
    const summary = summarize(standings);
    expect(summary).toMatchObject({ schools: 4, totalPoints: 45, leaderPoints: 20 });
    expect(summary.leaders.map(row => row.name)).toEqual(["Alpha", "Beta"]);
  });

  it("reports no leader and no medals before any points are published", () => {
    const empty = standings.map(row => ({ ...row, points: 0, rank: 1 }));
    expect(summarize(empty).leaders).toEqual([]);
    expect(empty.some(isMedal)).toBe(false);
    expect(empty.some(row => isTied(empty, row))).toBe(false);
    expect(summarize([]).leaders).toEqual([]);
  });

  it("detects shared ranks and medal positions", () => {
    expect(isTied(standings, standings[0])).toBe(true);
    expect(isTied(standings, standings[2])).toBe(false);
    expect(standings.map(isMedal)).toEqual([true, true, true, false]);
  });

  it("groups contributions in category order with subtotals", () => {
    const groups = groupContributions(contributions, categories);
    expect(groups.map(group => [group.name, group.points])).toEqual([["Category I", 13], ["Category II", 3]]);
    expect(groups[0].events.map(row => row.eventTitle)).toEqual(["Debate", "Art"]);
  });

  it("limits contributions to the selected category so they add up to the row total", () => {
    const groups = groupContributions(contributions, categories, "c2");
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map(row => row.eventId)).toEqual(["e1"]);
    expect(groupContributions(contributions, categories, "common")).toEqual([]);
  });

  it("pluralizes point labels", () => {
    expect(pointsLabel(1)).toBe("1 point");
    expect(pointsLabel(0)).toBe("0 points");
  });
});
