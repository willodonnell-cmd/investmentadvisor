import { useEffect, useRef, useState } from 'react'
import type { Thesis } from '../types'
import { initializeThesis } from '../api/thesisInitializer'
import { runExpertSynthesis, runNarrativeScenarios } from '../api/thesisBackground'
import { useThesisStore } from '../store/thesisStore'
import { useScenarioStore } from '../store/scenarioStore'
import { useSynthesisStore } from '../store/synthesisStore'

function needsConvictionInit(thesis: Thesis): boolean {
  if (thesis.convictionInitStatus === 'pending' || thesis.convictionInitStatus === 'failed') return true
  if (thesis.convictionInitStatus === 'complete') return false
  return thesis.thesisQualityScore === undefined && !thesis.convictionReasoning
}

export function useThesisBackgroundJobs(thesis: Thesis | undefined) {
  const [convictionRunning, setConvictionRunning] = useState(false)
  const [scenariosRunning, setScenariosRunning] = useState(false)
  const [expertRunning, setExpertRunning] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  const ranForThesisRef = useRef<string | null>(null)

  useEffect(() => {
    if (!thesis?.id) return
    if (ranForThesisRef.current === thesis.id) return
    ranForThesisRef.current = thesis.id

    const run = async () => {
      const freshThesis = () => useThesisStore.getState().theses[thesis.id] ?? thesis

      if (needsConvictionInit(freshThesis())) {
        setConvictionRunning(true)
        if (freshThesis().convictionInitStatus !== 'pending') {
          useThesisStore.getState().updateThesis(thesis.id, { convictionInitStatus: 'pending' })
        }
        try {
          await initializeThesis(freshThesis())
        } catch (err) {
          setJobError(err instanceof Error ? err.message : 'Conviction assessment failed')
        } finally {
          setConvictionRunning(false)
        }
      }

      if (useScenarioStore.getState().getByThesis(thesis.id).length === 0) {
        setScenariosRunning(true)
        try {
          await runNarrativeScenarios(freshThesis())
        } catch (err) {
          setJobError((prev) => prev ?? (err instanceof Error ? err.message : 'Scenario generation failed'))
        } finally {
          setScenariosRunning(false)
        }
      }

      if (!useSynthesisStore.getState().expertSyntheses[thesis.id]) {
        setExpertRunning(true)
        try {
          await runExpertSynthesis(freshThesis())
        } catch (err) {
          setJobError((prev) => prev ?? (err instanceof Error ? err.message : 'Expert synthesis failed'))
        } finally {
          setExpertRunning(false)
        }
      }
    }

    void run()
  }, [thesis?.id])

  return { convictionRunning, scenariosRunning, expertRunning, jobError }
}

export function isLegacyPhantomConvictionScore(
  thesis: Pick<Thesis, 'convictionInitStatus' | 'thesisQualityScore' | 'convictionReasoning'> | undefined,
  storedScore: number | undefined,
): boolean {
  if (!storedScore || thesis?.convictionInitStatus === 'complete') return false
  if (thesis?.thesisQualityScore !== undefined || thesis?.convictionReasoning) return false
  return storedScore === 70 && thesis?.convictionInitStatus !== 'failed'
}

export function resolveConvictionDisplay(
  thesis: Pick<Thesis, 'convictionInitStatus' | 'thesisQualityScore' | 'convictionReasoning'> | undefined,
  storedScore: number | undefined,
): { displayScore: number | undefined; isAssessing: boolean; isFailed: boolean } {
  const isFailed = thesis?.convictionInitStatus === 'failed'
  const isPending = thesis?.convictionInitStatus === 'pending'
  const isComplete = thesis?.convictionInitStatus === 'complete'
  const isPhantom = isLegacyPhantomConvictionScore(thesis, storedScore)

  if (isFailed) {
    return { displayScore: undefined, isAssessing: false, isFailed: true }
  }
  if (isPending || isPhantom || (!isComplete && thesis?.thesisQualityScore === undefined && !thesis?.convictionReasoning)) {
    return { displayScore: undefined, isAssessing: true, isFailed: false }
  }
  if (isComplete || thesis?.thesisQualityScore !== undefined) {
    return {
      displayScore: storedScore ?? thesis?.thesisQualityScore,
      isAssessing: false,
      isFailed: false,
    }
  }
  return { displayScore: undefined, isAssessing: true, isFailed: false }
}
