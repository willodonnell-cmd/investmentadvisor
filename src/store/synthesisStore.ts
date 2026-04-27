import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExpertSynthesisResult, ResearchView, UnderwritingMemo, ReassessmentMemo } from '../types'
import { createStorage } from '../storage/persistence'

interface SynthesisStore {
  expertSyntheses: Record<string, ExpertSynthesisResult>
  researchViews: Record<string, ResearchView>
  underwritingMemos: Record<string, UnderwritingMemo>
  reassessmentMemos: Record<string, ReassessmentMemo>

  setSynthesis: (thesisId: string, result: ExpertSynthesisResult) => void
  setResearchView: (thesisId: string, view: ResearchView) => void
  setMemo: (thesisId: string, memo: UnderwritingMemo) => void
  setReassessmentMemo: (thesisId: string, memo: ReassessmentMemo) => void
  clearThesis: (thesisId: string) => void
}

export const useSynthesisStore = create<SynthesisStore>()(
  persist(
    (set) => ({
      expertSyntheses: {},
      researchViews: {},
      underwritingMemos: {},
      reassessmentMemos: {},

      setSynthesis: (thesisId, result) =>
        set((s) => ({ expertSyntheses: { ...s.expertSyntheses, [thesisId]: result } })),

      setResearchView: (thesisId, view) =>
        set((s) => ({ researchViews: { ...s.researchViews, [thesisId]: view } })),

      setMemo: (thesisId, memo) =>
        set((s) => ({ underwritingMemos: { ...s.underwritingMemos, [thesisId]: memo } })),

      setReassessmentMemo: (thesisId, memo) =>
        set((s) => ({ reassessmentMemos: { ...s.reassessmentMemos, [thesisId]: memo } })),

      clearThesis: (thesisId) =>
        set((s) => {
          const { [thesisId]: _a, ...syntheses } = s.expertSyntheses
          const { [thesisId]: _b, ...views } = s.researchViews
          const { [thesisId]: _c, ...memos } = s.underwritingMemos
          const { [thesisId]: _d, ...reassessments } = s.reassessmentMemos
          return {
            expertSyntheses: syntheses, researchViews: views,
            underwritingMemos: memos, reassessmentMemos: reassessments,
          }
        }),
    }),
    { name: 'synthesis-store', storage: createStorage() }
  )
)
