import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createStorage } from '../storage/persistence'
import type { ConvictionDraft, ConvictionLedgerEntry } from '../types/conviction'

interface ConvictionStore {
  // Pending drafts — awaiting user review
  drafts: Record<string, ConvictionDraft>

  // Confirmed ledger entries — written only after explicit user confirmation
  ledger: Record<string, ConvictionLedgerEntry>

  // Conviction scores per thesis (0–100)
  convictionScores: Record<string, number>

  // Draft management
  addDraft: (draft: ConvictionDraft) => void
  dismissDraft: (draftId: string) => void
  getDraftsForThesis: (thesisId: string) => ConvictionDraft[]
  getPendingDraftCount: () => number

  // Ledger — only written via confirmDraft
  confirmDraft: (
    draftId: string,
    editedFields?: Partial<Pick<ConvictionDraft, 'currentStateAssessment' | 'agentReasoning' | 'proposedScoreChange' | 'deltaCategory' | 'recommendedAction'>>
  ) => ConvictionLedgerEntry | null
  getLedgerForThesis: (thesisId: string) => ConvictionLedgerEntry[]
  getRecentLedgerEntries: (limit?: number) => ConvictionLedgerEntry[]

  // Conviction score management
  getConvictionScore: (thesisId: string) => number
  setInitialConvictionScore: (thesisId: string, score: number) => void
}

export const useConvictionStore = create<ConvictionStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      ledger: {},
      convictionScores: {},

      // --- Draft management ---

      addDraft: (draft) =>
        set((s) => ({ drafts: { ...s.drafts, [draft.id]: draft } })),

      dismissDraft: (draftId) =>
        set((s) => {
          const { [draftId]: _, ...rest } = s.drafts
          return { drafts: rest }
        }),

      getDraftsForThesis: (thesisId) =>
        Object.values(get().drafts).filter((d) => d.thesisId === thesisId),

      getPendingDraftCount: () => Object.keys(get().drafts).length,

      // --- Ledger confirmation ---
      // This is the only path to writing a ledger entry.
      // No entry is written without explicit user confirmation.

      confirmDraft: (draftId, editedFields = {}) => {
        const draft = get().drafts[draftId]
        if (!draft) return null

        const isEdited = Object.keys(editedFields).length > 0

        const finalScoreChange = editedFields.proposedScoreChange ?? draft.proposedScoreChange
        const scoreBefore = draft.currentConvictionScore
        const scoreAfter = Math.max(10, Math.min(100, scoreBefore + finalScoreChange))

        const entry: ConvictionLedgerEntry = {
          id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          thesisId: draft.thesisId,
          thesisName: draft.thesisName,
          thesisStage: draft.thesisStage,

          triggerSignalId: draft.triggerSignalId,
          triggerSignalSummary: draft.triggerSignalSummary,
          triggerSignalSource: draft.triggerSignalSource,

          variable: draft.variable,

          originalAssumption: draft.originalAssumption,
          currentStateAssessment: editedFields.currentStateAssessment ?? draft.currentStateAssessment,
          deltaCategory: editedFields.deltaCategory ?? draft.deltaCategory,
          scoreChange: finalScoreChange,
          convictionScoreBefore: scoreBefore,
          convictionScoreAfter: scoreAfter,

          agentReasoning: editedFields.agentReasoning ?? draft.agentReasoning,
          recommendedAction: editedFields.recommendedAction ?? draft.recommendedAction,

          confirmedByUser: true,
          confirmedAt: new Date(),
          wasEdited: isEdited,
          originalDraftId: draftId,

          createdAt: new Date(),
        }

        // Write ledger entry, update conviction score, remove draft
        set((s) => {
          const { [draftId]: _, ...remainingDrafts } = s.drafts
          return {
            drafts: remainingDrafts,
            ledger: { ...s.ledger, [entry.id]: entry },
            convictionScores: { ...s.convictionScores, [draft.thesisId]: scoreAfter },
          }
        })

        return entry
      },

      getLedgerForThesis: (thesisId) =>
        Object.values(get().ledger)
          .filter((e) => e.thesisId === thesisId)
          .sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime()),

      getRecentLedgerEntries: (limit = 20) =>
        Object.values(get().ledger)
          .sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime())
          .slice(0, limit),

      // --- Conviction scores ---

      getConvictionScore: (thesisId) => get().convictionScores[thesisId] ?? 70,

      setInitialConvictionScore: (thesisId, score) =>
        set((s) => ({
          convictionScores: { ...s.convictionScores, [thesisId]: score },
        })),
    }),
    {
      name: 'conviction-store',
      storage: createStorage(),
    }
  )
)
