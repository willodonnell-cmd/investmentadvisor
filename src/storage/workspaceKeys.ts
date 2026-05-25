/**
 * Zustand `persist` localStorage keys used by Dossier.
 * Keep in sync when adding new persisted stores.
 */
export const DOSSIER_ZUSTAND_STORAGE_KEYS = [
  'investment-openai-settings',
  'thesis-store',
  'scenario-store',
  'kill-store',
  'paper-tracks',
  'signal-store',
  'portfolio-store',
  'synthesis-store',
  'conviction-store',
  'macro-store',
] as const

export type DossierStorageKey = (typeof DOSSIER_ZUSTAND_STORAGE_KEYS)[number]

/** Legacy keys removed on clear; migration may recreate `investment-openai-settings`. */
export const DOSSIER_LEGACY_STORAGE_KEYS = ['investment-openai-model'] as const

export function clearDossierLocalStorage(): void {
  if (typeof localStorage === 'undefined') return
  for (const k of DOSSIER_ZUSTAND_STORAGE_KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
  for (const k of DOSSIER_LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
