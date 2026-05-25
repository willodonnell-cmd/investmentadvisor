import {
  clearDossierLocalStorage,
  DOSSIER_ZUSTAND_STORAGE_KEYS,
  type DossierStorageKey,
} from './workspaceKeys'

export const WORKSPACE_BACKUP_FORMAT = 'dossier-workspace-backup' as const
export const WORKSPACE_BACKUP_VERSION = 1 as const

export type WorkspaceBackupFile = {
  format: typeof WORKSPACE_BACKUP_FORMAT
  version: typeof WORKSPACE_BACKUP_VERSION
  exportedAt: string
  host: string
  /** Raw localStorage values as returned by `localStorage.getItem` (Zustand JSON blobs). */
  stores: Partial<Record<DossierStorageKey, string | null>>
}

export function buildWorkspaceBackup(): WorkspaceBackupFile {
  const stores: Partial<Record<DossierStorageKey, string | null>> = {}
  if (typeof localStorage === 'undefined') {
    return {
      format: WORKSPACE_BACKUP_FORMAT,
      version: WORKSPACE_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      host: '',
      stores,
    }
  }
  for (const k of DOSSIER_ZUSTAND_STORAGE_KEYS) {
    try {
      stores[k] = localStorage.getItem(k)
    } catch {
      stores[k] = null
    }
  }
  return {
    format: WORKSPACE_BACKUP_FORMAT,
    version: WORKSPACE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    host: typeof location !== 'undefined' ? location.host : '',
    stores,
  }
}

export function downloadWorkspaceBackup(): void {
  const data = buildWorkspaceBackup()
  const safeHost = (data.host || 'dossier').replace(/[^a-zA-Z0-9.-]+/g, '-')
  const stamp = data.exportedAt.slice(0, 19).replace(/[:T]/g, '-')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dossier-workspace-${safeHost}-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function parseWorkspaceBackupFile(raw: string): WorkspaceBackupFile | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return null
    if (parsed.format !== WORKSPACE_BACKUP_FORMAT) return null
    if (parsed.version !== WORKSPACE_BACKUP_VERSION) return null
    if (!isRecord(parsed.stores)) return null
    const stores: Partial<Record<DossierStorageKey, string | null>> = {}
    for (const k of DOSSIER_ZUSTAND_STORAGE_KEYS) {
      if (!(k in parsed.stores)) continue
      const v = parsed.stores[k]
      if (v === null || v === undefined) stores[k] = null
      else if (typeof v === 'string') stores[k] = v
      else return null
    }
    return {
      format: WORKSPACE_BACKUP_FORMAT,
      version: WORKSPACE_BACKUP_VERSION,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      host: typeof parsed.host === 'string' ? parsed.host : '',
      stores,
    }
  } catch {
    return null
  }
}

/**
 * Wipe Dossier persist keys, then apply backup values. Keys omitted from the backup stay empty (defaults on reload).
 * Caller should `location.reload()` after this.
 */
export function restoreWorkspaceFromBackup(backup: WorkspaceBackupFile): void {
  clearDossierLocalStorage()
  if (typeof localStorage === 'undefined') return
  for (const k of DOSSIER_ZUSTAND_STORAGE_KEYS) {
    const v = backup.stores[k]
    if (v === null || v === undefined) continue
    try {
      localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  }
}
