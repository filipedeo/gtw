// Challenge mode — self-contained personal-best persistence + result formatting.
//
// Challenge mode layers a timed/question-capped scoring wrapper on top of any
// exercise. This module holds the localStorage-backed personal-best store
// (deliberately separate from progressStore, mirroring src/lib/noteSpeed.ts)
// and a small formatter for the end-of-challenge summary.

const STORAGE_PREFIX = 'gtw-challenge-best-';

/** Read the persisted best score for an exercise. Returns 0 when unset/invalid. */
export function loadBest(exerciseId: string): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${exerciseId}`);
    if (raw === null) return 0;
    const val = parseInt(raw, 10);
    return Number.isFinite(val) && val > 0 ? val : 0;
  } catch {
    return 0;
  }
}

/**
 * Persist a score if it beats the stored best. Returns true when a new best
 * was set (so the UI can show a "New best!" badge). Tolerates a missing
 * localStorage (SSR / privacy mode) by treating it as "not beaten".
 */
export function saveBest(exerciseId: string, score: number): boolean {
  if (score <= 0) return false;
  try {
    const current = loadBest(exerciseId);
    if (score > current) {
      localStorage.setItem(`${STORAGE_PREFIX}${exerciseId}`, String(score));
      return true;
    }
  } catch {
    // localStorage unavailable — treat as not beaten.
  }
  return false;
}

/**
 * Format a human-readable result summary for a completed challenge.
 * Shows the score, total answered, and the personal best with a "New best!"
 * marker when the current score set a record.
 */
export function formatChallengeResult(score: number, total: number, best: number): string {
  const newBest = score > 0 && score >= best;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const base = `Challenge complete: ${score}/${total} correct (${pct}%)`;
  const bestLine = newBest ? 'New best!' : `Best: ${best}`;
  return `${base} — ${bestLine}`;
}
