# PHASE_1_BRIEF.md — Data Layer and Shell

## Phase 1 Objective

Build the complete data layer and navigable shell. No AI functionality yet. When Phase 1 is complete, the user can navigate between all primary screens, create a placeholder thesis, and have it persist across sessions. Every subsequent phase builds on top of this foundation without touching it.

**Phase 1 is done when**: All TypeScript types compile without errors. Navigation between all five primary screens works. A placeholder thesis created in the app persists after a page refresh.

---

## File Structure

```
src/
├── types/
│   ├── thesis.ts          # Thesis, ThesisType, LifecycleStage, MispricedVariable
│   ├── company.ts         # Company, CompanyScore, ScoredDimensions, Quadrant
│   ├── position.ts        # Position, PositionAction, AccountType, PositionType
│   ├── signal.ts          # Signal, SignalComposite, SourceQualityTier
│   ├── scenario.ts        # Scenario, ScenarioType, ScenarioMomentum
│   ├── expert.ts          # ExpertVoice, PanelComposition, VerdictType
│   ├── macro.ts           # MacroRegime, all regime enums, MacroDriverExposure
│   ├── portfolio.ts       # Position, PortfolioMacroSignature, FactorExposure
│   ├── kill.ts            # KillRecord, KillType, KillTriggerPathway
│   └── index.ts           # re-exports everything
│
├── store/
│   ├── thesisStore.ts     # Zustand store for thesis portfolio
│   ├── portfolioStore.ts  # Zustand store for positions and sizing
│   ├── macroStore.ts      # Zustand store for macro regime
│   ├── signalStore.ts     # Zustand store for signals and composites
│   └── index.ts           # combined store exports
│
├── storage/
│   └── persistence.ts     # wrapper around window.storage API
│
├── components/
│   ├── layout/
│   │   ├── Shell.tsx          # outer app shell with sidebar
│   │   ├── Sidebar.tsx        # navigation sidebar
│   │   └── TopBar.tsx         # top bar with lens selector
│   ├── cards/
│   │   ├── ThesisCard.tsx     # thesis summary card
│   │   ├── CompanyCard.tsx    # company card
│   │   ├── SignalCard.tsx     # individual signal card
│   │   ├── TriggerCard.tsx    # trigger status card
│   │   └── PositionCard.tsx   # position summary card
│   ├── ui/
│   │   ├── Badge.tsx          # lifecycle stage badges, verdict badges
│   │   ├── ScoreBar.tsx       # horizontal score bar 0-10
│   │   ├── TriggerIndicator.tsx # readiness label + indicator
│   │   ├── LensSelector.tsx   # Standalone | Prologis-Aware | Compare vs Prologis
│   │   ├── Drawer.tsx         # slide-out detail drawer
│   │   ├── ProgressRing.tsx   # decay clock visual
│   │   └── EmptyState.tsx     # consistent empty state component
│   └── shared/
│       └── LoadingSpinner.tsx
│
├── screens/
│   ├── InvestmentDesk.tsx     # home screen / dashboard
│   ├── BrainstormingScreen.tsx # spark → canvas (Phase 2)
│   ├── ThesisScreen.tsx       # thesis detail view
│   ├── ComparisonScreen.tsx   # company comparison (Phase 3)
│   ├── DecisionScreen.tsx     # capital allocation decision (Phase 4)
│   └── PortfolioScreen.tsx    # portfolio architecture view (Phase 5)
│
├── api/
│   └── anthropic.ts           # standard API call wrapper
│
├── utils/
│   ├── scoring.ts             # Kelly calc, modifier math, composite scoring
│   ├── formatting.ts          # number formatting, date formatting
│   └── thesisHelpers.ts       # lifecycle transitions, kill type detection
│
├── constants/
│   ├── expertBench.ts         # 18-voice bench definitions
│   ├── macroDrivers.ts        # 15 macro driver definitions
│   ├── factors.ts             # 8 factor definitions
│   └── taxonomy.ts            # mispriced variable taxonomy
│
└── App.tsx                    # router and top-level providers
```

---

## Complete TypeScript Types

### thesis.ts

```typescript
export type ThesisType =
  | 'LongDurationCompounder'
  | 'MacroRegimeShift'
  | 'DeepContrarianMispricing'
  | 'SpecialSituationsCatalyst'
  | 'CapitalAllocationQuality'
  | 'MarketStructureReflexivity'
  | 'TechnologyDisruption'
  | 'RegulatoryPolicy'
  | 'IndustryStructureConsumerBehavior'
  | 'CapitalCycle'
  | 'OperationalTurnaround'
  | 'RealEstatePhysicalAssets'
  | 'Geopolitical'
  | 'ShortHedgeThesis'
  | 'HouseholdAllocationDecision'

export type LifecycleStage =
  | 'Signal'
  | 'Hypothesis'
  | 'PressureTest'
  | 'Actionable'
  | 'Watch'
  | 'Live'
  | 'PlayedOut'
  | 'Broken'
  | 'Archived'

export type MispricedVariable =
  | 'GrowthRate'
  | 'GrowthDurability'
  | 'MarginStructure'
  | 'TimingOfInflection'
  | 'CapitalIntensity'
  | 'CloseOrOutcomeProbability'
  | 'CompetitiveWinner'
  | 'ValueAccrualLocation'
  | 'RegulatoryPolicyImpact'
  | 'BalanceSheetResilience'
  | 'CapitalAllocationQuality'
  | 'MarketStructureForcedFlow'
  | 'CrowdingExpectations'
  | 'TerminalValueDuration'
  | 'ManagementExecution'

export type TriggerReadiness =
  | 'NotReady'
  | 'Building'
  | 'Accelerating'
  | 'Active'
  | 'Diminishing'

export type VariantPerceptionStrength =
  | 'ClearConsensusStrongVariant'
  | 'MixedConsensusModerateVariant'
  | 'UnclearConsensusWeakVariant'
  | 'BroadlyAgreesWithConsensus'

export interface Trigger {
  type: 'Valuation' | 'FundamentalEvidence' | 'CatalystEvent' | 'MarketStructure' | 'Management' | 'PolicyRegulatory' | 'IndustryStructure'
  description: string
  readiness: TriggerReadiness
  readinessScore: number  // 0-100
  isPrimary: boolean
}

export interface DecayClock {
  statedHorizonMonths: number
  elapsedMonths: number
  elapsedPct: number      // 0-100
  zone: 'Green' | 'Yellow' | 'Orange' | 'Red' | 'Overdue'
  isFrozen: boolean
  frozenUntil?: Date
  frozenReason?: string
}

export interface ChangeEntry {
  changedAt: Date
  field: string
  previousValue: unknown
  newValue: unknown
  reason: string
}

export interface Thesis {
  id: string
  name: string
  type: ThesisType
  stage: LifecycleStage
  statement: string
  whyNow: string
  timeHorizon: number
  transmissionPath: string
  valueCaptureMethod: string
  
  // Variant perception
  consensusView: string
  variantView: string
  variantPerceptionStrength: VariantPerceptionStrength
  primaryMispricedVariable: MispricedVariable
  secondaryMispricedVariables: MispricedVariable[]
  
  // Underwriting
  keyAssumptions: string[]
  disconfirmers: string[]
  beneficiaries: string[]
  losers: string[]
  
  // Triggers
  triggers: Trigger[]
  
  // Lifecycle management
  decayClock: DecayClock
  evidenceDriftScore: number    // rolling 90-day, -10 to +10
  evidenceDriftDirection: 'Positive' | 'Neutral' | 'Negative' | 'SevereNegative'
  
  // Linked objects
  scenarioIds: string[]
  linkedCompanyIds: string[]
  linkedSignalIds: string[]
  panelCompositionId?: string
  
  // Macro regime
  macroRegimeCompatibility?: RegimeCompatibilityScore
  
  // Portfolio
  quadrant?: 'FullConviction' | 'HoldOrWatch' | 'TacticalPosition' | 'Avoid'
  businessQualityScore?: number   // 0-10
  stockAttractivenessScore?: number // 0-10
  scoreGap?: number
  
  // Scores
  thesisQualityScore?: number   // 0-10
  triggerReadinessScore?: number // 0-100
  
  // Metadata
  changeHistory: ChangeEntry[]
  createdAt: Date
  updatedAt: Date
  lens: 'Standalone' | 'PrologisAware' | 'CompareVsPrologis'
}
```

### scenario.ts

```typescript
export type ScenarioType = 'ThesisConfirmed' | 'ContestedPath' | 'ThesisBroken'

export interface Scenario {
  id: string
  linkedThesisId: string
  type: ScenarioType
  name: string                    // evocative label, NOT "Bull Case"
  coreNarrative: string
  keyAssumptions: string[]
  causalChain: string[]           // ordered steps
  confirmingEvidence: string[]
  disconfirmingEvidence: string[]
  shiftTriggers: {
    towardConfirmed?: string
    towardBroken?: string
  }
  returnRangeMin: number          // % return
  returnRangeMax: number
  probability: number             // 0-1, three scenarios must sum to 1
  momentumScore: number           // 0-100, from signal tagging
  baseRateAnchor?: number         // from Named Scenario Library
  createdAt: Date
  updatedAt: Date
}
```

### expert.ts

```typescript
export type ExpertVoiceId =
  | 'Buffett' | 'Munger' | 'Fisher' | 'Smith'
  | 'Soros' | 'Druckenmiller' | 'Marks'
  | 'Burry' | 'Klarman' | 'Greenblatt'
  | 'Miller' | 'Wood' | 'Ackman'
  | 'Zell' | 'Chancellor'
  | 'Asness' | 'Kahneman' | 'Damodaran'

export type VerdictType = 'Endorse' | 'Challenge' | 'Reject' | 'Reframe'

export type PanelPosture = 'Constructive' | 'Mixed' | 'Skeptical' | 'Hostile'

export interface VoiceContribution {
  voiceId: ExpertVoiceId
  lensApplied: string
  verdict: VerdictType
  coreArgument: string
  primaryMispricedVariableFocus: MispricedVariable
  whatWouldChangeVerdict: string
  confidence: 'High' | 'Medium' | 'Low'
  scenarioProbabilities?: {    // for scenario framework integration
    thesisConfirmed: number
    contestedPath: number
    thesisBroken: number
  }
}

export interface PanelComposition {
  id: string
  linkedThesisId: string
  selectedVoices: ExpertVoiceId[]
  selectionRules: string[]     // which rules triggered which voice
  contributions: VoiceContribution[]
  verdictDistribution: {
    endorse: number
    challenge: number
    reject: number
    reframe: number
  }
  convergencePoints: string[]
  divergencePoints: string[]
  mostContestedVariable: MispricedVariable
  whatWouldResolveDisagreement: string
  panelPosture: PanelPosture
  panelProbabilityMatrix?: {   // aggregate of voice scenario probabilities
    thesisConfirmed: number
    contestedPath: number
    thesisBroken: number
  }
  coverageDisclosure?: string  // panel coverage gaps flagged here
  structuralFactsLayer: {
    liquidity: string
    positionSizeFeasibility: string
    executionRisk: string
    timeToClose: string
  }
  generatedAt: Date
}
```

### macro.ts

```typescript
export type RealRateRegime = 'Low' | 'Normal' | 'High' | 'Rising' | 'Falling'
export type CreditCycleRegime = 'Expansion' | 'LateCycle' | 'Contraction' | 'Recovery'
export type LiquidityRegime = 'Abundant' | 'Normal' | 'Tight'
export type RiskAppetiteRegime = 'RiskOn' | 'Neutral' | 'RiskOff' | 'Bifurcated'
export type DollarRegime = 'Strong' | 'Neutral' | 'Weak' | 'Strengthening' | 'Weakening'
export type PolicyRegime = 'Permissive' | 'Restrictive' | 'Activist'

export type RegimeCompatibilityScore =
  | 'StrongTailwind'
  | 'Tailwind'
  | 'Mixed'
  | 'Headwind'
  | 'StrongHeadwind'

export interface MacroRegimeDimension {
  classification: string
  supportingThesisTypes: string[]
  opposingThesisTypes: string[]
  lastUpdated: Date
  userOverride?: string
}

export interface MacroRegime {
  realRates: RealRateRegime
  creditCycle: CreditCycleRegime
  liquidity: LiquidityRegime
  riskAppetite: RiskAppetiteRegime
  dollar: DollarRegime
  policy: PolicyRegime
  lastUpdated: Date
  userOverrides: Partial<{
    realRates: RealRateRegime
    creditCycle: CreditCycleRegime
    liquidity: LiquidityRegime
    riskAppetite: RiskAppetiteRegime
    dollar: DollarRegime
    policy: PolicyRegime
  }>
}

export type MacroDriver =
  | 'AiCapexCycle'
  | 'UsInterestRates'
  | 'CreditCycle'
  | 'DollarDirection'
  | 'EnergyPriceLevel'
  | 'ChinaEconomicTrajectory'
  | 'DeglobalizationReshoring'
  | 'RegulatoryEnvironment'
  | 'GeopoliticalRiskPremium'
  | 'ConsumerHealth'
  | 'LaborMarketWageDynamics'
  | 'RealAssetRepricing'
  | 'TechnologyAdoptionCurve'
  | 'PoliticalEconomyFiscal'
  | 'ClimateEnergyTransition'

export interface MacroDriverExposure {
  driver: MacroDriver
  weightedExposurePct: number    // % of portfolio exposed
  linkedThesisIds: string[]
  classification: 'Minimal' | 'Moderate' | 'Concentrated' | 'Extreme'
}
```

### portfolio.ts

```typescript
export type PositionType = 'Long' | 'Short' | 'Paired' | 'Hedge'
export type AccountType = 'Taxable' | 'IRA401k' | 'Roth' | 'PrologisConcentrated'

export type PositionAction =
  | 'DoNotOwn' | 'Watch' | 'Start' | 'Add' | 'Hold' | 'Trim' | 'Exit'
  | 'RotateToBetterExpression'
  | 'InitiateShort' | 'CoverShort'
  | 'EstablishPair' | 'UnwindPair'
  | 'AddHedge' | 'RollHedge' | 'RemoveHedge'

export type SizingRung =
  | 'WatchOnly'
  | 'StarterPosition'
  | 'HalfPosition'
  | 'FullPosition'
  | 'OverweightConviction'
  | 'TrimmedCore'
  | 'Exit'

export interface SizingOutput {
  sizingBand: [number, number]   // [min%, max%] of investable portfolio
  targetSizePct: number
  startingSizePct: number
  rung: SizingRung
  anchorSize: number
  combinedModifier: number
  boundedModifier: number
  modifierBreakdown: {
    underwritingQuality: number
    variantPerception: number
    triggerReadiness: number
    quadrant: number
    convictionDecay: number
    macroRegime: number
  }
  portfolioConstraints: {
    overlapPenalty: number
    concentrationAdjustment: number
    capitalSourceAdjustment: number
    macroDriverConcentration: number
  }
  rationale: string
  whatWouldIncreaseSize: string[]
  whatWouldDecreaseSize: string[]
  whatWouldTriggerExit: string[]
}

export interface Position {
  id: string
  linkedThesisId: string
  linkedCompanyId?: string
  type: PositionType
  currentAction: PositionAction
  currentSizePct: number
  targetSizePct: number
  sizingOutput?: SizingOutput
  account: AccountType
  isIntentionalCorrelation: boolean
  capitalSource?: string
  openedAt: Date
  updatedAt: Date
}

export type FactorType =
  | 'MarketBeta' | 'Value' | 'Quality' | 'Momentum'
  | 'Size' | 'Duration' | 'Commodity' | 'Credit'

export interface FactorExposure {
  factor: FactorType
  netScore: number              // weighted, -2 to +2
  classification: 'Balanced' | 'ModerateConcentration' | 'Concentrated' | 'Extreme'
}

export interface CorrelatedPair {
  thesisIdA: string
  thesisIdB: string
  correlationScore: number      // 0 to 1
  classification: 'Uncorrelated' | 'LowCorrelation' | 'ModerateCorrelation' | 'HighCorrelation' | 'NearIdentical'
  primaryCorrelationDriver: 'MacroDriver' | 'Factor' | 'Trigger' | 'Scenario'
  intentional?: boolean         // null = unclassified
  recommendedAction?: string
}

export interface StressTestResult {
  scenario: string
  expectedPortfolioImpact: number  // % return
  mostImpactedTheses: Array<{ thesisId: string; impact: number }>
}

export interface PortfolioMacroSignature {
  macroDriverExposures: MacroDriverExposure[]
  factorProfile: FactorExposure[]
  highCorrelationPairs: CorrelatedPair[]
  triggerDependencies: Array<{
    thesisIdA: string
    thesisIdB: string
    strength: 'Significant' | 'Structural'
    upstreamCondition: string
  }>
  stressTestResults: StressTestResult[]
  diversificationQualityScore: number   // 0-10
  diversificationInterpretation: string
  lastCalculated: Date
}
```

---

## Zustand Store Architecture

### thesisStore.ts

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Thesis, LifecycleStage } from '../types'

interface ThesisStore {
  theses: Record<string, Thesis>
  activeThesisId: string | null
  
  // Actions
  addThesis: (thesis: Thesis) => void
  updateThesis: (id: string, updates: Partial<Thesis>) => void
  setActiveThesis: (id: string | null) => void
  advanceLifecycle: (id: string, stage: LifecycleStage, reason: string) => void
  getActiveTheses: () => Thesis[]
  getThesisByStage: (stage: LifecycleStage) => Thesis[]
}

export const useThesisStore = create<ThesisStore>()(
  persist(
    (set, get) => ({
      theses: {},
      activeThesisId: null,
      
      addThesis: (thesis) =>
        set((state) => ({ theses: { ...state.theses, [thesis.id]: thesis } })),
      
      updateThesis: (id, updates) =>
        set((state) => ({
          theses: {
            ...state.theses,
            [id]: {
              ...state.theses[id],
              ...updates,
              updatedAt: new Date(),
              changeHistory: [
                ...(state.theses[id]?.changeHistory || []),
                {
                  changedAt: new Date(),
                  field: Object.keys(updates).join(', '),
                  previousValue: null,
                  newValue: updates,
                  reason: 'User update'
                }
              ]
            }
          }
        })),
      
      setActiveThesis: (id) => set({ activeThesisId: id }),
      
      advanceLifecycle: (id, stage, reason) => {
        const thesis = get().theses[id]
        if (!thesis) return
        get().updateThesis(id, {
          stage,
          changeHistory: [
            ...thesis.changeHistory,
            { changedAt: new Date(), field: 'stage', previousValue: thesis.stage, newValue: stage, reason }
          ]
        })
      },
      
      getActiveTheses: () =>
        Object.values(get().theses).filter(
          (t) => !['Broken', 'Archived', 'PlayedOut'].includes(t.stage)
        ),
      
      getThesisByStage: (stage) =>
        Object.values(get().theses).filter((t) => t.stage === stage)
    }),
    {
      name: 'thesis-store',
      storage: {
        getItem: async (key) => {
          try {
            const result = await window.storage.get(key)
            return result ? JSON.parse(result.value) : null
          } catch { return null }
        },
        setItem: async (key, value) => {
          await window.storage.set(key, JSON.stringify(value))
        },
        removeItem: async (key) => {
          await window.storage.delete(key)
        }
      }
    }
  )
)
```

---

## Primary Screen Shells

### InvestmentDesk.tsx — Shell Structure

Sections (all empty in Phase 1, populated in later phases):

1. **Top bar**: Lens selector (Standalone | Prologis-Aware | Compare vs Prologis), Macro Regime snapshot (6 colored dots)
2. **Active Theses rail**: horizontal scroll of Thesis Cards for Live and Actionable theses
3. **Evidence Dashboard**: placeholder (Phase 5)
4. **Thesis Pipeline**: Kanban-style columns by lifecycle stage (Signal through Live), showing thesis counts
5. **Recent Signals**: placeholder (Phase 4)
6. **Portfolio Snapshot**: placeholder (Phase 4)

### Navigation Structure

```
InvestmentDesk     /                  Home, always accessible
BrainstormingScreen /brainstorm       Phase 2
ThesisScreen       /thesis/:id        Phase 2
ComparisonScreen   /compare           Phase 3
DecisionScreen     /decision/:id      Phase 4
PortfolioScreen    /portfolio         Phase 5
```

Sidebar items: Desk | Brainstorm | Theses | Compare | Decisions | Portfolio | Admin

---

## Constants to Define in Phase 1

### expertBench.ts — 18 voices with cognitive modules

```typescript
export const EXPERT_BENCH = {
  Buffett: {
    name: 'Warren Buffett',
    cluster: 'QualityAndDuration',
    module: 'Business quality, durable moats, owner-operator capital allocation, decade-plus duration',
    characteristicReasoning: 'Would I still want to own this business in ten years if the market closed tomorrow?'
  },
  Munger: {
    name: 'Charlie Munger',
    cluster: 'SkepticismAndInversion',
    module: 'Mental models, inversion, incentive analysis, intellectual immune system',
    characteristicReasoning: 'Invert, always invert. What would have to be true for this to fail catastrophically?'
  },
  // ... all 18 defined here
} as const
```

### taxonomy.ts — mispriced variable labels

```typescript
export const MISPRICED_VARIABLE_LABELS: Record<MispricedVariable, string> = {
  GrowthRate: 'Growth Rate',
  GrowthDurability: 'Growth Durability',
  MarginStructure: 'Margin Structure',
  TimingOfInflection: 'Timing of Inflection',
  CapitalIntensity: 'Capital Intensity',
  CloseOrOutcomeProbability: 'Close / Outcome Probability',
  CompetitiveWinner: 'Competitive Winner',
  ValueAccrualLocation: 'Value Accrual Location',
  RegulatoryPolicyImpact: 'Regulatory / Policy Impact',
  BalanceSheetResilience: 'Balance Sheet Resilience',
  CapitalAllocationQuality: 'Capital Allocation Quality',
  MarketStructureForcedFlow: 'Market Structure / Forced Flow',
  CrowdingExpectations: 'Crowding / Expectations',
  TerminalValueDuration: 'Terminal Value / Duration',
  ManagementExecution: 'Management Execution'
}
```

---

## Phase 1 Completion Checklist

- [ ] All TypeScript types compile with zero errors
- [ ] Zustand stores initialize and persist via storage API
- [ ] App.tsx renders with router
- [ ] Sidebar navigation works between all 5 screen shells
- [ ] InvestmentDesk shell renders with correct section layout
- [ ] ThesisCard component renders with placeholder data
- [ ] Badge component renders all lifecycle stages with correct colors
- [ ] TriggerIndicator renders all 5 readiness states
- [ ] LensSelector renders and updates the active lens in macroStore
- [ ] A placeholder thesis created in the app persists after refresh
- [ ] Dark mode design system applied globally
- [ ] Manrope font loaded and applied
- [ ] All color variables defined in CSS/Tailwind config

---

## Phase 1 Does NOT Include

- Any Anthropic API calls
- Any AI-generated content
- The Expert Synthesis View
- Signal processing
- Position sizing math
- Scenario generation

These all belong to Phases 2 through 5. Phase 1 is the skeleton. Keep it clean.
