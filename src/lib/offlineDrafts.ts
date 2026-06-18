/**
 * Offline Form Drafts — save and restore form data locally.
 * Citizens can start filling a form, leave, and come back later.
 *
 * Usage:
 *   // Save draft as user types
 *   saveDraft("kibari_sherehe", formData);
 *
 *   // Load draft when form opens
 *   const saved = loadDraft("kibari_sherehe");
 *   if (saved) setFormData(saved);
 *
 *   // Clear after successful submission
 *   clearDraft("kibari_sherehe");
 */

const DRAFT_PREFIX = "emtaa_draft_";

export function saveDraft(serviceKey: string, data: Record<string, unknown>): void {
  try {
    const key = DRAFT_PREFIX + serviceKey;
    localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadDraft(
  serviceKey: string,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000, // default: 7 days
): Record<string, unknown> | null {
  try {
    const key = DRAFT_PREFIX + serviceKey;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    // Check if draft is too old
    if (Date.now() - savedAt > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearDraft(serviceKey: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + serviceKey);
  } catch {
    // ignore
  }
}

export function hasDraft(serviceKey: string): boolean {
  return loadDraft(serviceKey) !== null;
}

/** List all saved drafts */
export function listDrafts(): { key: string; savedAt: number }[] {
  const drafts: { key: string; savedAt: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(DRAFT_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const { savedAt } = JSON.parse(raw);
          drafts.push({ key: k.replace(DRAFT_PREFIX, ""), savedAt });
        }
      }
    }
  } catch {
    // ignore
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}
