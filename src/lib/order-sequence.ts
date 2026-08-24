const MAX_CLUSTER_GAP = 100;

export function extractOrderSequenceNumber(
  numero?: string | null,
  yearMonth?: string,
): number | null {
  if (!numero || typeof numero !== "string") return null;
  const match = yearMonth
    ? numero.match(new RegExp(`^KL-${yearMonth}-(\\d+)$`, "i"))
    : numero.match(/-(\d+)$/);
  if (!match) return null;

  const sequence = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}

/**
 * Selects the dominant contiguous sequence cluster. This prevents a handful of
 * imported or provisional numbers from dragging a tenant's sequence forward.
 */
export function computeNextOrderSequence(numbers: (number | null | undefined)[]): number {
  const unique = [
    ...new Set(
      numbers.filter((value): value is number => Number.isSafeInteger(value) && Number(value) > 0),
    ),
  ].sort((a, b) => a - b);

  if (unique.length === 0) return 1;
  if (unique.length === 1) return unique[0] > 5000 ? 1 : unique[0] + 1;

  const clusters: number[][] = [];
  for (const sequence of unique) {
    const current = clusters.at(-1);
    if (!current || sequence - current[current.length - 1] > MAX_CLUSTER_GAP) {
      clusters.push([sequence]);
    } else {
      current.push(sequence);
    }
  }

  const dominant = clusters.reduce((best, candidate) => {
    if (candidate.length > best.length) return candidate;
    if (candidate.length < best.length) return best;

    // In a tie, prefer the lower cluster. It is safer to preserve the established
    // sequence than to accept a small provisional-number cluster as authoritative.
    return candidate[candidate.length - 1] < best[best.length - 1] ? candidate : best;
  });

  return dominant[dominant.length - 1] + 1;
}
