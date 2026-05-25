import type { LifecycleStage } from '../types'
import type { PaperTrack } from '../types/paperTrack'

/** Bump when persisted thesis / paper-track shape or lifecycle enums change. */
export const LIFECYCLE_STORE_VERSION = 1

const LEGACY_TO_LIFECYCLE: Record<string, LifecycleStage> = {
  Signal: 'Developing',
  Hypothesis: 'Developing',
  PressureTest: 'Actionable',
  Watch: 'Actionable',
  Developing: 'Developing',
  Actionable: 'Actionable',
  Live: 'Live',
  PlayedOut: 'PlayedOut',
  Broken: 'Broken',
  Archived: 'Archived',
}

export function normalizeLifecycleStage(stage: unknown): LifecycleStage {
  if (typeof stage === 'string' && stage in LEGACY_TO_LIFECYCLE) {
    return LEGACY_TO_LIFECYCLE[stage]
  }
  return 'Developing'
}

type ThesisPersisted = {
  theses?: Record<string, { stage?: unknown }>
  activeThesisId?: string | null
}

export function migrateThesisPersisted(state: unknown, version: number): unknown {
  if (version >= LIFECYCLE_STORE_VERSION) return state
  const s = (state ?? {}) as ThesisPersisted
  if (!s.theses) return state

  const theses = Object.fromEntries(
    Object.entries(s.theses).map(([id, thesis]) => [
      id,
      { ...thesis, stage: normalizeLifecycleStage(thesis.stage) },
    ]),
  )
  return { ...s, theses }
}

type LegacyPaperTrack = PaperTrack & { watchedAt?: string }

type PaperTrackPersisted = {
  tracks?: Record<string, LegacyPaperTrack>
}

export function migratePaperTrackPersisted(state: unknown, version: number): unknown {
  if (version >= LIFECYCLE_STORE_VERSION) return state
  const s = (state ?? {}) as PaperTrackPersisted
  if (!s.tracks) return state

  const thesisStages = readThesisStagesFromStorage()

  const tracks = Object.fromEntries(
    Object.entries(s.tracks).map(([id, track]) => {
      const { watchedAt, ...rest } = track
      const actionableAt = rest.actionableAt ?? watchedAt ?? new Date().toISOString()
      const liveAt =
        rest.liveAt ??
        (thesisStages[track.thesisId] === 'Live' ? actionableAt : undefined)
      return [id, { ...rest, actionableAt, ...(liveAt ? { liveAt } : {}) } satisfies PaperTrack]
    }),
  )
  return { ...s, tracks }
}

function readThesisStagesFromStorage(): Record<string, LifecycleStage> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem('thesis-store')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { state?: ThesisPersisted }
    const theses = parsed.state?.theses ?? {}
    return Object.fromEntries(
      Object.entries(theses).map(([id, thesis]) => [
        id,
        normalizeLifecycleStage(thesis.stage),
      ]),
    )
  } catch {
    return {}
  }
}

type StageCarrier = { thesisStage?: unknown }

type ConvictionPersisted = {
  drafts?: Record<string, StageCarrier>
  ledger?: Record<string, StageCarrier>
  convictionScores?: Record<string, number>
}

function migrateStageCarrier<T extends StageCarrier>(entry: T): T {
  if (!entry.thesisStage) return entry
  return { ...entry, thesisStage: normalizeLifecycleStage(entry.thesisStage) }
}

export function migrateConvictionPersisted(state: unknown, version: number): unknown {
  if (version >= LIFECYCLE_STORE_VERSION) return state
  const s = (state ?? {}) as ConvictionPersisted

  return {
    ...s,
    drafts: s.drafts
      ? Object.fromEntries(Object.entries(s.drafts).map(([id, d]) => [id, migrateStageCarrier(d)]))
      : s.drafts,
    ledger: s.ledger
      ? Object.fromEntries(Object.entries(s.ledger).map(([id, e]) => [id, migrateStageCarrier(e)]))
      : s.ledger,
  }
}

function migrateRawPersistKey(key: string, migrate: (state: unknown, version: number) => unknown): void {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem(key)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as { state?: unknown; version?: number }
    const version = parsed.version ?? 0
    if (version >= LIFECYCLE_STORE_VERSION) return
    localStorage.setItem(
      key,
      JSON.stringify({
        state: migrate(parsed.state, version),
        version: LIFECYCLE_STORE_VERSION,
      }),
    )
  } catch {
    /* ignore corrupt storage */
  }
}

/** One-time patch for data saved before lifecycle rename (runs before Zustand rehydrate). */
export function migrateLifecycleLocalStorage(): void {
  migrateRawPersistKey('thesis-store', migrateThesisPersisted)
  migrateRawPersistKey('paper-tracks', migratePaperTrackPersisted)
  migrateRawPersistKey('conviction-store', migrateConvictionPersisted)
}
