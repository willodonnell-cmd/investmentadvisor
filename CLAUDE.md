# CLAUDE.md — Thesis-First Investment System

## What This System Is

A thesis-first investment brainstorming, underwriting, portfolio, and household capital allocation system. It is not a stock screener, not a trading bot, not a generic portfolio tracker. Every output is thesis-linked. Every company appears as an expression of a thesis. Every position is sized by asymmetry, shaped by conviction, constrained by portfolio context.

**The one rule that overrides everything else**: No floating stock opinions. No company recommendation without a thesis. No thesis without a transmission path.

---

## System Identity and Non-Negotiables

- Thesis first, company second
- Underwriting over summary
- Mispricing over narrative
- Best business is not always best stock (these are two separate scored objects)
- Variant perception is a formal framework, not a comment
- Every kill is a learning event, not a failure
- Prologis is a standing portfolio reality, not a forced comparator
- The household allocation context always informs the portfolio view

---

## Core Data Objects

These are the eight primary persistent objects. Full TypeScript definitions are in `/src/types/`.

```typescript
// Thesis — the spine of the entire system
interface Thesis {
  id: string
  name: string
  type: ThesisType           // 18 thesis types defined in types/thesis.ts
  stage: LifecycleStage      // Signal | Hypothesis | PressureTest | Actionable | Watch | Live | PlayedOut | Broken | Archived
  statement: string
  whyNow: string
  timeHorizon: number        // months
  transmissionPath: string
  primaryMispricedVariable: MispricedVariable
  secondaryMispricedVariables: MispricedVariable[]
  keyAssumptions: string[]
  disconfirmers: string[]
  scenarios: Scenario[]      // exactly 3: ThesisConfirmed | ContestedPath | ThesisBroken
  expertSynthesisPanel: PanelComposition
  macroRegimeCompatibility: RegimeCompatibilityScore
  businessQualityScore?: CompanyScore
  stockAttractivenessScore?: CompanyScore
  decayClock: DecayClock
  signalComposites: SignalComposite[]
  changeHistory: ChangeEntry[]
  createdAt: Date
  updatedAt: Date
}

// Company — always linked to a thesis, never floating
interface Company {
  id: string
  ticker: string
  name: string
  linkedThesisId: string
  roleInThesis: string
  businessQualityScore: ScoredDimensions   // 7 dimensions, 0-10
  stockAttractivenessScore: ScoredDimensions // 8 dimensions, 0-10
  quadrant: 'FullConviction' | 'HoldOrWatch' | 'TacticalPosition' | 'Avoid'
  scoreGap: number
  catalysts: string[]
  updatedAt: Date
}

// Position — a live or intended capital allocation
interface Position {
  id: string
  linkedThesisId: string
  linkedCompanyId: string
  type: 'Long' | 'Short' | 'Paired' | 'Hedge'
  currentAction: PositionAction
  currentSizePct: number       // % of investable portfolio
  targetSizePct: number
  sizingBand: [number, number]
  account: AccountType
  anchorSize: number           // raw quarter-Kelly output
  combinedModifier: number     // Layer 2 product
  updatedAt: Date
}

// Signal — evidence on a mispriced variable
interface Signal {
  id: string
  linkedThesisId: string
  linkedCompanyId?: string
  variable: MispricedVariable
  scenarioTag: 'ThesisConfirmed' | 'ContestedPath' | 'ThesisBroken' | 'Neutral'
  direction: 'Strengthening' | 'Neutral' | 'Weakening'
  sourceQuality: SourceQualityTier
  sourceIndependent: boolean
  specificity: 'Direct-Quantifiable' | 'Direct-Qualitative' | 'Indirect' | 'Tangential'
  weight: number               // computed from weighting model
  observedAt: Date
}

// Scenario — narrative-driven, not return-driven
interface Scenario {
  type: 'ThesisConfirmed' | 'ContestedPath' | 'ThesisBroken'
  name: string                 // evocative label, not "Bull Case"
  coreNarrative: string
  keyAssumptions: string[]
  causalChain: string[]
  confirmingEvidence: string[]
  disconfirmingEvidence: string[]
  shiftTriggers: { up?: string; down?: string }
  returnRange: [number, number] // % return range
  probability: number
  momentumScore: number        // 0-100, from signal tagging
}

// MacroRegime — standing context object, informs all thesis scoring
interface MacroRegime {
  realRates: RealRateRegime
  creditCycle: CreditCycleRegime
  liquidity: LiquidityRegime
  riskAppetite: RiskAppetiteRegime
  dollar: DollarRegime
  policy: PolicyRegime
  lastUpdated: Date
  userOverrides: Partial<MacroRegime>
}

// KillRecord — every thesis death is structured and productive
interface KillRecord {
  thesisId: string
  killType: 1 | 2 | 3 | 4 | 5  // Core Assumption Broken | Opportunity Closed | Better Expression | Superseded | Conviction Exhausted
  triggerPathway: 'A' | 'B' | 'C' | 'D'
  killReason: string           // one sentence
  brokenAssumption?: string    // required for Type 1
  lessonLearned: string
  learningRoutes: LearningSignal[]
  killedAt: Date
}

// PortfolioMacroSignature — cross-thesis correlation output
interface PortfolioMacroSignature {
  macroDriverExposures: MacroDriverExposure[]
  factorProfile: FactorExposure[]
  highCorrelationPairs: CorrelatedPair[]
  stressTestResults: StressTestResult[]
  diversificationQualityScore: number  // 0-10
  lastCalculated: Date
}
```

---

## Module Map

| Module | Phase | Primary Input | Primary Output | Spec Location |
|---|---|---|---|---|
| Investment Desk | 1 | — | Navigation shell | PHASE_1_BRIEF.md |
| Data Layer | 1 | — | TypeScript types + Zustand store | PHASE_1_BRIEF.md |
| Brainstorming Mode | 2 | Theme or question | Thesis Discovery Canvas | PHASE_2_BRIEF.md |
| Thesis Discovery Canvas | 2 | Theme | 13-section structured canvas | PHASE_2_BRIEF.md |
| Thesis Object + Card | 2 | Canvas selection | Structured thesis with lifecycle | PHASE_2_BRIEF.md |
| Expert Synthesis View | 3 | Thesis object | 18-voice dynamic panel + synthesis | EXPERT_SYNTHESIS_SPEC.md |
| Full Underwriting Memo | 3 | Thesis + Expert View | 15-section memo | PHASE_3_BRIEF.md |
| Macro Regime Layer | 3 | Market data | Regime classifications + thesis compatibility | PHASE_3_BRIEF.md |
| Narrative Scenario Framework | 3 | Thesis | 3 named scenarios with causal chains | PHASE_3_BRIEF.md |
| Decision Screen | 4 | Thesis + position | Capital allocation recommendation | PHASE_4_BRIEF.md |
| Position Sizing Framework | 4 | Thesis + portfolio | Sizing band + rationale | PHASE_4_BRIEF.md |
| Conviction Decay Mechanism | 4 | Active theses | Decay clock + forced reassessment | PHASE_4_BRIEF.md |
| Signal Aggregation | 4 | Raw signals | Composite scores + convergence alerts | PHASE_4_BRIEF.md |
| Formal Kill Protocol | 4 | Dying thesis | Kill memo + learning extraction | PHASE_4_BRIEF.md |
| Cross-Thesis Correlation | 5 | Full portfolio | Macro signature + correlation matrix | PHASE_5_BRIEF.md |
| Portfolio Correlation Dashboard | 5 | Macro signature | Stress tests + diversification score | PHASE_5_BRIEF.md |
| Evidence Dashboard | 5 | Signal composites | Portfolio signal heatmap | PHASE_5_BRIEF.md |

---

## API Architecture

Every AI-powered feature calls the Anthropic API using the standard pattern below. The system prompt is constructed from three layers every time:

1. **System identity layer**: the thesis-first principles and the specific module's job (100-200 tokens, hardcoded per module)
2. **Context layer**: the current thesis object, portfolio state, and macro regime (variable, injected from Zustand store)
3. **Expert bench layer**: the relevant panel composition and voice definitions for Expert Synthesis View calls (injected when module requires it)

```typescript
// Standard API call pattern — use this everywhere
const callInvestmentAPI = async (
  systemPrompt: string,
  userContent: string,
  structuredOutput?: boolean
) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    })
  })
  const data = await response.json()
  if (structuredOutput) {
    const text = data.content.map((b: any) => b.text || "").join("")
    return JSON.parse(text.replace(/```json|```/g, "").trim())
  }
  return data.content.map((b: any) => b.text || "").join("")
}
```

**Structured output rule**: When a module needs JSON (thesis objects, scenario objects, scoring outputs), instruct the model to return only valid JSON with no preamble. Parse with try/catch always.

**Context management rule**: Never pass the full thesis history to every call. Pass only the fields the specific module needs. The full thesis object lives in Zustand. Extract and inject only relevant slices.

---

## Build Sequence

| Phase | Sessions | Deliverable | Done When |
|---|---|---|---|
| 1 | 1-2 | Data layer + shell screens | Navigation works, types compile, storage persists |
| 2 | 3-5 | Brainstorming + Thesis workflow | User can spark → canvas → thesis card |
| 3 | 6-9 | Expert Synthesis + Underwriting Memo | Full underwriting memo generates end-to-end |
| 4 | 10-14 | Portfolio + Sizing + Decay + Kill | Live portfolio with dynamic sizing works |
| 5 | 15-18 | Cross-thesis correlation + Dashboards | Macro signature and stress tests operational |

**Rule for every session**: Start by reading this file. Then read the relevant phase brief. Then build. Never start coding without knowing which phase deliverable you are working toward.

---

## Design System

Aesthetic: Raycast-inspired. Premium, calm, high-signal, non-overwhelming. Dark mode primary.

```
Font:        Manrope (all weights)
Accent:      #ff6b6b (warm red)
Background:  #0a0a0a (near black)
Surface:     #141414 (card background)
Surface-2:   #1a1a1a (elevated surface)
Border:      #2a2a2a (subtle border)
Text-primary: #f0f0f0
Text-secondary: #888888
Text-muted:  #555555
Success:     #4ade80
Warning:     #fb923c
Danger:      #f87171
```

Glassmorphism for cards: `backdrop-filter: blur(12px)`, `background: rgba(20,20,20,0.8)`, `border: 1px solid rgba(255,255,255,0.06)`

UI patterns:
- Summary first, progressive disclosure always
- Cards for judgment, tables for comparison, drawers for depth
- Verdict labels (Endorse | Challenge | Reject | Reframe) as primary visual signal in Expert Synthesis View
- Lifecycle stage as a colored badge on every Thesis Card
- Trigger readiness as a labeled indicator (Not Ready | Building | Accelerating | Active | Diminishing)

---

## Spec References

| Topic | File |
|---|---|
| Full original system spec | MASTER_SPEC.md (generate in Phase 2) |
| Expert Synthesis View complete spec | EXPERT_SYNTHESIS_SPEC.md (generate before Phase 3) |
| All 10 locked improvements | IMPROVEMENTS.md (generate before Phase 3) |
| Eighteen-voice bench definitions | EXPERT_BENCH.md (generate before Phase 3) |
| Mispriced variable taxonomy | in /src/types/thesis.ts |
| Macro driver taxonomy | in /src/types/macro.ts |
| Factor taxonomy | in /src/types/portfolio.ts |

---

## Prologis Rule

The user has significant concentrated Prologis exposure. The system treats Prologis as:
- A standing portfolio reality in all household allocation calculations
- A concentration factor that feeds the Cross-Thesis Correlation module
- A lens that modifies position sizing when the Prologis-Aware lens is active
- Never a forced comparator on every thesis

Default lens: Prologis-Aware. This means the Prologis macro driver profile (primary: real asset repricing, consumer health; secondary: US interest rates) is always included in portfolio-level calculations.

---

## What Good Output Looks Like

Every AI-generated output must be: thesis-linked, concise first (deeper on demand), explicit about uncertainty, explicit about what is mispriced, explicit about what would change the recommendation. Favor sharp judgment over decorative complexity. Kill vague enthusiasm immediately.
