export const GPLINKS_URL = "https://shrinkme.click/Beg01";
const KEY = "student_study_unlock";
const TRIAL_KEY = "student_study_trial_start";
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 Din Free Demo

export type Unlock = { kind: string; until: number; phone?: string | undefined };

/** 3 Din ke Demo ki Live Timing info */
export function trialInfo(): { until: number; msLeft: number; isExpired: boolean } {
  try {
    let start = Number(localStorage.getItem(TRIAL_KEY));
    if (!start) {
      start = Date.now();
      localStorage.setItem(TRIAL_KEY, String(start));
    }
    const until = start + TRIAL_MS;
    const msLeft = Math.max(0, until - Date.now());
    return { until, msLeft, isExpired: msLeft <= 0 };
  } catch {
    return { until: 0, msLeft: 0, isExpired: true };
  }
}

/** Check karta hai ki kya student ne sach me koi FREE ya VIP key dali hai */
export function hasRealKey(): Unlock | null {
  try {
    const u = JSON.parse(localStorage.getItem(KEY) || "null") as Unlock | null;
    if (u && u.until > Date.now() && (u.kind === "free" || u.kind === "vip")) {
      return u;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readUnlock(): Unlock | null {
  const real = hasRealKey();
  if (real) return real;
  const t = trialInfo();
  return !t.isExpired ? { kind: "demo", until: t.until } : null;
}

export function writeUnlock(u: Unlock) {
  localStorage.setItem(KEY, JSON.stringify(u));
}
