import type { Thesis } from '../types'
import { generateExpertSynthesis } from './expertSynthesis'
import { generateResearchView } from './underwriting'
import { generateScenarios } from './scenarios'
import { useSynthesisStore } from '../store/synthesisStore'
import { useScenarioStore } from '../store/scenarioStore'

export async function runExpertSynthesis(thesis: Thesis): Promise<void> {
  const { researchViews, setResearchView, setSynthesis } = useSynthesisStore.getState()
  let researchView = researchViews[thesis.id]
  if (!researchView) {
    researchView = await generateResearchView(thesis)
    setResearchView(thesis.id, researchView)
  }
  const result = await generateExpertSynthesis(thesis, thesis.lens, researchView)
  setSynthesis(thesis.id, result)
}

export async function runNarrativeScenarios(thesis: Thesis): Promise<void> {
  const { removeByThesis, upsertMany } = useScenarioStore.getState()
  removeByThesis(thesis.id)
  const scenarios = await generateScenarios(thesis)
  upsertMany(scenarios)
}
