import { v4 as uuid } from 'uuid'
import { callInvestmentAPI, SYSTEM_IDENTITY } from './openai'
import { Thesis, Scenario, ScenarioType } from '../types'

const SCENARIOS_SYSTEM = `${SYSTEM_IDENTITY}

Your current role: Generate exactly three narrative scenarios for the provided investment thesis. Scenarios must be named evocatively — never "Bull Case", "Bear Case", "Base Case". Each scenario must reflect a distinct causal path, not just a return range. The scenarios together must cover the realistic distribution of outcomes, not just optimistic and pessimistic tails.`

type RawScenario = Omit<Scenario, 'id' | 'linkedThesisId' | 'createdAt' | 'updatedAt'>

export const generateScenarios = async (thesis: Thesis): Promise<Scenario[]> => {
  const prompt = `Generate exactly 3 named scenarios for this thesis.

THESIS:
Name: ${thesis.name}
Type: ${thesis.type}
Statement: ${thesis.statement}
Transmission Path: ${thesis.transmissionPath}
Primary Mispriced Variable: ${thesis.primaryMispricedVariable}
Key Assumptions: ${thesis.keyAssumptions.join('; ')}
Disconfirmers: ${thesis.disconfirmers.join('; ')}

Return ONLY valid JSON. No preamble, no markdown, no explanation.

{
  "scenarios": [
    {
      "type": "ThesisConfirmed",
      "name": "evocative name — NOT Bull Case",
      "coreNarrative": "2-3 sentences on the specific path by which the thesis plays out",
      "keyAssumptions": ["assumption that must hold", "..."],
      "causalChain": ["step 1 — specific event or development", "step 2", "step 3", "step 4"],
      "confirmingEvidence": ["observable evidence that would confirm this path", "..."],
      "disconfirmingEvidence": ["observable evidence that would disconfirm", "..."],
      "shiftTriggers": {
        "towardConfirmed": "specific event that would increase probability of this scenario",
        "towardBroken": "specific event that would reduce probability of this scenario"
      },
      "returnRangeMin": 40,
      "returnRangeMax": 80,
      "probability": 0.35,
      "momentumScore": 45,
      "baseRateAnchor": 0.30,
      "primaryMispricedVariableFocus": "the mispriced variable this scenario hinges on"
    },
    {
      "type": "ContestedPath",
      "name": "evocative name for the contested / partial outcome",
      "coreNarrative": "2-3 sentences on the specific path where thesis is partially right but something prevents full expression",
      "keyAssumptions": ["assumption that must hold", "..."],
      "causalChain": ["step 1", "step 2", "step 3", "step 4"],
      "confirmingEvidence": ["observable evidence confirming this path"],
      "disconfirmingEvidence": ["observable evidence disconfirming this path"],
      "shiftTriggers": {
        "towardConfirmed": "event that increases probability of full thesis confirmation",
        "towardBroken": "event that pushes toward thesis broken"
      },
      "returnRangeMin": 5,
      "returnRangeMax": 25,
      "probability": 0.40,
      "momentumScore": 40,
      "baseRateAnchor": 0.40,
      "primaryMispricedVariableFocus": "the mispriced variable this scenario hinges on"
    },
    {
      "type": "ThesisBroken",
      "name": "evocative name for the broken thesis outcome",
      "coreNarrative": "2-3 sentences on the specific path by which the thesis fails — different causal path from ThesisConfirmed",
      "keyAssumptions": ["assumption whose failure breaks the thesis"],
      "causalChain": ["step 1", "step 2", "step 3", "step 4"],
      "confirmingEvidence": ["observable evidence confirming this broken path"],
      "disconfirmingEvidence": ["observable evidence disconfirming the broken path"],
      "shiftTriggers": {
        "towardConfirmed": "event that would rescue the thesis",
        "towardBroken": "event that accelerates thesis breakdown"
      },
      "returnRangeMin": -40,
      "returnRangeMax": -15,
      "probability": 0.25,
      "momentumScore": 25,
      "baseRateAnchor": 0.30,
      "primaryMispricedVariableFocus": "the mispriced variable whose mispricing is revealed to be wrong"
    }
  ]
}

Requirements:
- The three probability values MUST sum to exactly 1.0
- Names must be evocative and specific to this thesis — not generic
- Causal chains must be ordered steps (4-6 steps), not prose
- ThesisConfirmed and ThesisBroken are not mirror images — they have different causal paths
- ContestedPath is not a "base case" — it is a specific path where the thesis is partially right but something prevents full expression
- baseRateAnchor should reflect historical base rates for this thesis type resolving favorably (typically 0.25-0.40)
- primaryMispricedVariableFocus must be one of: GrowthRate | GrowthDurability | MarginStructure | TimingOfInflection | CapitalIntensity | CloseOrOutcomeProbability | CompetitiveWinner | ValueAccrualLocation | RegulatoryPolicyImpact | BalanceSheetResilience | CapitalAllocationQuality | MarketStructureForcedFlow | CrowdingExpectations | TerminalValueDuration | ManagementExecution`

  const result = await callInvestmentAPI<{ scenarios: RawScenario[] }>(
    SCENARIOS_SYSTEM, prompt, true, 4000,
  )

  // Deduplicate: keep at most one scenario per type (first occurrence wins)
  const seen = new Set<string>()
  const deduped = result.scenarios.filter(s => {
    if (seen.has(s.type)) return false
    seen.add(s.type)
    return true
  })

  // Normalize probabilities to sum to exactly 1.0
  const total = deduped.reduce((sum, s) => sum + (s.probability ?? 0), 0)
  const normalized = deduped.map(s => ({
    ...s,
    probability: total > 0 ? s.probability / total : 1 / deduped.length,
  }))

  const now = new Date()
  return normalized.map((s) => ({
    ...s,
    id: uuid(),
    linkedThesisId: thesis.id,
    createdAt: now,
    updatedAt: now,
  }))
}
