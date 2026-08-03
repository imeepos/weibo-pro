export interface UserDataQuality {
  eligibleCount: number;
  filteredCount: number;
  coverageRate: number;
}

export function buildUserDataQuality(
  candidateCount: number,
  eligibleCount: number,
): UserDataQuality {
  const candidates = Math.max(0, candidateCount);
  const eligible = Math.min(candidates, Math.max(0, eligibleCount));

  return {
    eligibleCount: eligible,
    filteredCount: candidates - eligible,
    coverageRate: candidates
      ? Number(((eligible / candidates) * 100).toFixed(1))
      : 0,
  };
}
