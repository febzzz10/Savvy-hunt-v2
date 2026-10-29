export type ScoreRow<K> = { schoolId: K; points: number };
export type EntryRow<K> = ScoreRow<K> & { placement?: number; entryLabel?: string };
const entryKey = <K>(row: EntryRow<K>) => `${String(row.schoolId)}\u0000${row.points}\u0000${row.placement ?? ""}\u0000${(row.entryLabel ?? "").trim()}`;
export function sameEntries<K>(left: EntryRow<K>[], right: EntryRow<K>[]) {
  if (left.length !== right.length) return false;
  const a = left.map(entryKey).sort(), b = right.map(entryKey).sort();
  return a.every((value, index) => value === b[index]);
}
export function contributions<K>(rows: ScoreRow<K>[]) {
  const sums = new Map<K,number>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.points) || row.points < 0) throw new Error("Points must be a nonnegative integer");
    const total = (sums.get(row.schoolId) ?? 0) + row.points;
    if (!Number.isSafeInteger(total)) throw new Error("Total points exceed the safe integer range");
    sums.set(row.schoolId, total);
  }
  return sums;
}
export function deltas<K>(oldRows: ScoreRow<K>[], newRows: ScoreRow<K>[]) {
  const old = contributions(oldRows), next = contributions(newRows), result = new Map<K,number>();
  for (const key of new Set([...old.keys(),...next.keys()])) result.set(key,(next.get(key) ?? 0) - (old.get(key) ?? 0));
  return result;
}
export function rank<T extends {name:string;points:number}>(rows:T[]) {
  return [...rows].sort((a,b)=>b.points-a.points || a.name.localeCompare(b.name)).map((row,index,array)=>({ ...row, rank: index && row.points === array[index-1].points ? array.findIndex(x=>x.points===row.points)+1 : index+1 }));
}
