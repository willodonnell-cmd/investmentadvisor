import React, { useCallback, useRef, useState } from 'react'
import { getEnvLabel, type EnvTone } from '../lib/envLabel'
import { clearDossierLocalStorage } from '../storage/workspaceKeys'
import {
  downloadWorkspaceBackup,
  parseWorkspaceBackupFile,
  restoreWorkspaceFromBackup,
} from '../storage/workspaceBackup'

const toneStyle: Record<EnvTone, React.CSSProperties> = {
  local: {
    color: '#1e4d6b',
    background: 'rgba(30,77,107,0.10)',
    border: '1px solid rgba(30,77,107,0.28)',
  },
  prod: {
    color: '#7A4A10',
    background: 'rgba(122,74,16,0.10)',
    border: '1px solid rgba(122,74,16,0.28)',
  },
  other: {
    color: '#4a1d6b',
    background: 'rgba(74,29,107,0.08)',
    border: '1px solid rgba(74,29,107,0.22)',
  },
}

export const WorkspaceScreen: React.FC = () => {
  const env = getEnvLabel()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onExport = useCallback(() => {
    setError(null)
    setMessage(null)
    try {
      downloadWorkspaceBackup()
      setMessage('Download started.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }, [])

  const onPickFile = () => fileRef.current?.click()

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setMessage(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const backup = parseWorkspaceBackupFile(text)
      if (!backup) {
        setError('Invalid backup file. Expected dossier-workspace-backup v1 JSON.')
        return
      }
      if (!window.confirm(
        'Replace all workspace data on this site with the backup and reload?\n\n'
        + `Backup from: ${backup.host || 'unknown'}\nExported: ${backup.exportedAt}`,
      )) {
        return
      }
      try {
        restoreWorkspaceFromBackup(backup)
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed')
      }
    }
    reader.onerror = () => setError('Could not read file')
    reader.readAsText(file)
  }, [])

  const onClear = useCallback(() => {
    setError(null)
    setMessage(null)
    if (!window.confirm(
      'Clear all Dossier data stored in this browser for this site (theses, signals, portfolio, etc.)?\n\nThis cannot be undone. Export a backup first if you need a copy.',
    )) return
    if (!window.confirm('Final confirmation: wipe local workspace data?')) return
    try {
      clearDossierLocalStorage()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clear failed')
    }
  }, [])

  return (
    <div className="min-h-full p-5 max-w-[800px]">
      <h1 className="text-xl font-bold text-text-primary">Workspace</h1>
      <p className="text-xs text-text-muted mt-1 italic">
        Data is local to this browser — not synced across devices.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          Environment
        </span>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
          style={toneStyle[env.tone]}
        >
          {env.label}
        </span>
        <span className="text-xs text-text-muted font-mono">{env.detail}</span>
      </div>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-2">Backup</h2>
          <button
            type="button"
            onClick={onExport}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:border-accent/40 transition-colors text-text-primary"
          >
            Export JSON
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-2">Restore</h2>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            onClick={onPickFile}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:border-accent/40 transition-colors text-text-primary"
          >
            Import JSON…
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-2">Reset</h2>
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 text-xs font-semibold rounded-lg border transition-colors"
            style={{
              color: '#A02828',
              borderColor: 'rgba(160,40,40,0.35)',
              background: 'rgba(160,40,40,0.06)',
            }}
          >
            Clear workspace data…
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-2">API keys</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Local: <span className="font-mono">.env</span> · Production: <span className="font-mono">VITE_*</span> vars in Vercel project settings.
          </p>
        </section>
      </div>

      {message && (
        <p className="mt-4 text-xs text-text-secondary">{message}</p>
      )}
      {error && (
        <p className="mt-4 text-xs text-danger font-mono break-all">{error}</p>
      )}
    </div>
  )
}
