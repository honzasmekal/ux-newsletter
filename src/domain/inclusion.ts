export interface InclusionSignals {
  actionable: boolean;
  evidence: "empirická studie" | "blog" | "názor" | string;
  novel: boolean;
}

/**
 * Recall filtr (§7) — propustka „na stůl", ne skóre.
 * Akčnost je nejtvrdší filtr, ale sama o sobě propustí. Empirická + nová evidence projde i bez akčnosti.
 */
export function passesInclusion(s: InclusionSignals): boolean {
  if (s.actionable) return true;
  if (s.evidence.includes("empirická") && s.novel) return true;
  return false;
}
