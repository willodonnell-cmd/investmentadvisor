import type { Thesis } from '../types'
import { initializeThesis } from './thesisInitializer'
import { runExpertSynthesis, runNarrativeScenarios } from './thesisBackground'

const STAGGER_MS = 1500

/** Fire background jobs after canvas→thesis. Staggered to reduce API contention. */
export function startThesisBackgroundJobs(thesis: Thesis): void {
  void initializeThesis(thesis).catch(() => {})

  window.setTimeout(() => {
    void runNarrativeScenarios(thesis).catch(() => {})
  }, STAGGER_MS)

  window.setTimeout(() => {
    void runExpertSynthesis(thesis).catch(() => {})
  }, STAGGER_MS * 2)
}
