import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { createStorage } from '../storage/persistence'
import type { JournalEntry } from '../types/journal'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

interface JournalStore {
  entries: JournalEntry[]
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void
  deleteEntry: (id: string) => void
  getEntriesByThesis: (thesisId: string) => JournalEntry[]
  getEntriesPendingReview: () => JournalEntry[]
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({
          entries: [
            { ...entry, id: uuid(), createdAt: new Date().toISOString() },
            ...state.entries,
          ],
        })),

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

      getEntriesByThesis: (thesisId) =>
        get().entries.filter((e) => e.thesisId === thesisId),

      // Pending = predictionOutcome is 'pending' AND entry is more than 90 days old
      getEntriesPendingReview: () => {
        const cutoff = Date.now() - NINETY_DAYS_MS
        return get().entries.filter(
          (e) => e.predictionOutcome === 'pending' && new Date(e.createdAt).getTime() < cutoff,
        )
      },
    }),
    {
      name: 'journal-store',
      storage: createStorage(),
    },
  ),
)
