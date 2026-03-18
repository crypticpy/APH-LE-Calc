import type { AgeGroupKey } from "../types/health";
import { AGE_GROUP_RANGES } from "./constants";

export function getAgeGroup(age: number): AgeGroupKey {
  const group = AGE_GROUP_RANGES.find((g) => age >= g.min && age <= g.max);
  if (!group) return "85 and older";
  return group.key as AgeGroupKey;
}

export function getAgeGroupLabel(age: number): string {
  const group = AGE_GROUP_RANGES.find((g) => age >= g.min && age <= g.max);
  return group?.label ?? "85+ years";
}
