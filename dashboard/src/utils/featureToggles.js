/**
 * Feature toggles — persisted in localStorage.
 *
 * Each toggle controls visibility of a page in the sidebar, routing, and dashboard cards.
 */

const STORAGE_KEY = 'zamzam_feature_toggles'

/** Default toggle values (true = enabled). */
export const FEATURE_DEFAULTS = {
  archaeology: false,
  satellite: true,
}

export function loadToggles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      // Merge with defaults so new toggles get their default value
      return { ...FEATURE_DEFAULTS, ...saved }
    }
  } catch {
    // ignore
  }
  return { ...FEATURE_DEFAULTS }
}

export function saveToggles(toggles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles))
}
