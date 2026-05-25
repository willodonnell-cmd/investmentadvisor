import { useThesisStore } from '../store/thesisStore'
import { useScenarioStore } from '../store/scenarioStore'
import { useSynthesisStore } from '../store/synthesisStore'
import { useSignalStore } from '../store/signalStore'
import { usePortfolioStore } from '../store/portfolioStore'
import { usePaperTrackStore } from '../store/paperTrackStore'
import { useConvictionStore } from '../store/convictionStore'

export function deleteThesisFromSystem(
  thesisId: string,
  thesisName: string,
  options?: { skipConfirm?: boolean },
): boolean {
  if (!options?.skipConfirm) {
    const tickers = useThesisStore.getState().theses[thesisId]?.recommendations
      ?.map((r) => r.ticker)
      .filter(Boolean)
    const tickerNote = tickers?.length ? `\n\nRemoves tracked stocks: ${tickers.join(', ')}` : ''
    if (!confirm(`Delete "${thesisName}"?\n\nThis removes the thesis, signals, scenarios, expert synthesis, paper track positions, and portfolio links.${tickerNote}\n\nThis cannot be undone.`)) {
      return false
    }
  }

  useScenarioStore.getState().removeByThesis(thesisId)
  useSynthesisStore.getState().clearThesis(thesisId)
  useSignalStore.getState().removeByThesis(thesisId)
  useConvictionStore.getState().clearThesisData(thesisId)
  usePaperTrackStore.getState().removeTrack(thesisId)

  const portfolio = usePortfolioStore.getState()
  portfolio.getPositionsByThesis(thesisId).forEach((p) => portfolio.removePosition(p.id))
  portfolio.getCompaniesByThesis(thesisId).forEach((c) => portfolio.removeCompany(c.id))

  const thesisStore = useThesisStore.getState()
  thesisStore.removeThesis(thesisId)
  if (thesisStore.activeThesisId === thesisId) {
    thesisStore.setActiveThesis(null)
  }

  return true
}

export function deleteAllThesesFromSystem(thesisIds: string[]): number {
  if (thesisIds.length === 0) return 0
  if (!confirm(`Delete ${thesisIds.length} theses and all related data?\n\nThis cannot be undone.`)) {
    return 0
  }
  let deleted = 0
  for (const id of thesisIds) {
    const name = useThesisStore.getState().theses[id]?.name ?? 'Thesis'
    if (deleteThesisFromSystem(id, name, { skipConfirm: true })) deleted += 1
  }
  return deleted
}
