import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { KillRecord, KillType } from '../types'
import { createStorage } from '../storage/persistence'

interface KillStore {
  killRecords: Record<string, KillRecord>

  addKillRecord: (record: KillRecord) => void
  getKillsByType: (type: KillType) => KillRecord[]
  getRecentKills: (limit?: number) => KillRecord[]
}

export const useKillStore = create<KillStore>()(
  persist(
    (set, get) => ({
      killRecords: {},

      addKillRecord: (record) =>
        set((s) => ({ killRecords: { ...s.killRecords, [record.id]: record } })),

      getKillsByType: (type) =>
        Object.values(get().killRecords).filter((r) => r.killType === type),

      getRecentKills: (limit = 10) =>
        Object.values(get().killRecords)
          .sort((a, b) => new Date(b.killedAt).getTime() - new Date(a.killedAt).getTime())
          .slice(0, limit),
    }),
    { name: 'kill-store', storage: createStorage() }
  )
)
