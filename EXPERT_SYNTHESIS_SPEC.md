# EXPERT_SYNTHESIS_SPEC.md — The Eighteen-Voice Bench

## Purpose

The Expert Synthesis View is the system's structured adversarial panel. It selects 3-5 voices from the fixed bench of 18, produces a structured per-voice contribution, synthesizes a panel-level verdict, and reconciles against the Research View. The output is opinionated but evidence-based. The selection is dynamic but governed.

This document is the authoritative reference for all Expert Synthesis View implementation in Phase 3.

---

## The Eighteen-Voice Bench

### Cluster 1: Quality and Duration

**Buffett**
- Full name: Warren Buffett
- Module: Business quality, durable moats, owner-operator capital allocation, decade-plus duration
- Characteristic question: "Would I still want to own this in ten years if the market closed tomorrow?"
- Primary thesis types: LongDurationCompounder, CapitalAllocationQuality
- Mandatory for: Nothing (but almost always relevant for quality theses)

**Smith**
- Full name: Terry Smith
- Module: Quality compounder discipline, ROIC focus, refusal to overpay, patience
- Characteristic question: "What is the return on incremental invested capital, and can management sustain it?"
- Primary thesis types: LongDurationCompounder, CapitalAllocationQuality

**Fisher**
- Full name: Philip Fisher
- Module: Scuttlebutt, qualitative ground-truth, fifteen-points framework
- Characteristic question: "What do customers, competitors, and former employees actually say about this business?"
- Primary thesis types: IndustryStructureConsumerBehavior, TechnologyDisruption

---

### Cluster 2: Skepticism and Inversion

**Munger**
- Full name: Charlie Munger
- Module: Mental models, inversion, incentive analysis, intellectual immune system
- Characteristic question: "Invert always. What would have to be true for this to fail catastrophically?"
- Mandatory for: ALL panels (default mandatory skeptic)
- Notes: If Munger is not the mandatory skeptic, Kahneman or Asness takes the role

**Kahneman**
- Full name: Daniel Kahneman
- Module: Cognitive bias, base rates, pre-mortem, decision architecture
- Characteristic question: "What is the reference class, and what does history say about outcomes in this category?"
- Mandatory for: Narrative-heavy theses, theses where analyst conviction appears anchored
- Notes: Mandatory skeptic when thesis depends heavily on management narrative or analyst sentiment

**Asness**
- Full name: Cliff Asness
- Module: Factor discipline, behavioral skepticism, attribution honesty
- Characteristic question: "Is this genuine variant perception or just a known factor exposure wearing a clever costume?"
- Mandatory for: Theses at risk of being disguised factor bets
- Notes: Mandatory skeptic when thesis has high exposure to momentum, quality, or value factors

---

### Cluster 3: Macro and Reflexivity

**Soros**
- Full name: George Soros
- Module: Reflexivity, narrative feedback loops, market prices as inputs to reality
- Characteristic question: "How is the prevailing narrative feeding back into the fundamentals, and where does the loop break?"
- Primary thesis types: MacroRegimeShift, MarketStructureReflexivity, Geopolitical

**Druckenmiller**
- Full name: Stanley Druckenmiller
- Module: Macro-to-micro synthesis, earnings revision momentum, concentration discipline
- Characteristic question: "Where is the earnings power accelerating, and is the macro a tailwind or headwind?"
- Primary thesis types: MacroRegimeShift, any thesis requiring concentration discipline

**Marks**
- Full name: Howard Marks
- Module: Risk pricing, cycle awareness, second-order thinking, probabilistic humility
- Characteristic question: "Where are we in the cycle, and what is the market not pricing in?"
- Primary thesis types: MacroRegimeShift, any late-cycle or credit-sensitive thesis
- Mandatory for: Portfolio Review Panel (fixed)

---

### Cluster 4: Contrarian and Forensic

**Burry**
- Full name: Michael Burry
- Module: Structural mispricing, forensic accounting, asymmetric short setups
- Characteristic question: "What do the financial statements actually say versus what the narrative claims?"
- Primary thesis types: DeepContrarianMispricing, ShortHedgeThesis
- Mandatory for: Short/hedge theses, theses with accounting complexity

**Klarman**
- Full name: Seth Klarman
- Module: Margin of safety in complexity, distressed and illiquid situations, patient capital
- Characteristic question: "Where is the structural margin of safety, and what is the capital structure doing?"
- Primary thesis types: DeepContrarianMispricing, SpecialSituationsCatalyst, ShortHedgeThesis
- Mandatory for: Short/hedge theses (either Klarman or Greenblatt), Household allocation theses

**Greenblatt**
- Full name: Joel Greenblatt
- Module: Special situations, capital structure events, systematic earnings yield framework
- Characteristic question: "Is there a mechanical or structural reason this opportunity exists, and what is the built-in catalyst?"
- Primary thesis types: SpecialSituationsCatalyst, ShortHedgeThesis
- Mandatory for: Short/hedge theses (either Klarman or Greenblatt)

---

### Cluster 5: Growth and Disruption

**Miller**
- Full name: Bill Miller
- Module: Probabilistic valuation across eras, bridging value and growth frameworks
- Characteristic question: "Is the traditional valuation framework itself the problem, or is the business actually overvalued?"
- Primary thesis types: TechnologyDisruption, LongDurationCompounder

**Wood**
- Full name: Cathie Wood
- Module: Innovation curves, Wright's Law cost declines, disruption stress test
- Characteristic question: "Where is the cost curve compressing faster than incumbents can adapt?"
- Primary thesis types: TechnologyDisruption
- Notes: Useful for disruption stress test; chronically optimistic on timing

**Ackman**
- Full name: Bill Ackman
- Module: Activist catalysts, concentrated conviction, capital structure unlock
- Characteristic question: "Who unlocks the value, how, and on what timeline?"
- Primary thesis types: SpecialSituationsCatalyst, CapitalAllocationQuality

---

### Cluster 6: Real Assets and Cycles

**Zell**
- Full name: Sam Zell
- Module: Real estate cycles, concentrated holding discipline, supply-demand imbalance in physical assets
- Characteristic question: "Where is the supply-demand imbalance in physical assets, and has the cycle run?"
- Primary thesis types: RealEstatePhysicalAssets, CapitalCycle
- Mandatory for: Any thesis touching real assets, industrial real estate, logistics, supply chain when Prologis-Aware or Compare vs Prologis lens is active (Prologis Lens Trigger)
- Mandatory for: Household allocation theses involving real estate concentration

**Chancellor**
- Full name: Edward Chancellor
- Module: Capital cycle analysis, where capital floods in and flees
- Characteristic question: "Where has capital been flooding in, and what does that mean for future returns in that sector?"
- Primary thesis types: CapitalCycle, RealEstatePhysicalAssets, MacroRegimeShift

---

### Cluster 7: Valuation Bridge

**Damodaran**
- Full name: Aswath Damodaran
- Module: Narrative-to-numbers translation, reverse-engineered market expectations
- Characteristic question: "What story does the current valuation imply, and are those numbers achievable?"
- Mandatory for: All theses at Pressure Test stage or beyond (Actionable, Watch, Live)
- Notes: Not included for Portfolio Review Panel (that is a risk function, not valuation)
- Not included for Portfolio Hedge theses

---

## Selection Logic

### Step 1: Map thesis type to primary and secondary clusters

| Thesis Type | Primary Cluster | Secondary Clusters |
|---|---|---|
| LongDurationCompounder | Quality and Duration | Skepticism, Valuation Bridge |
| MacroRegimeShift | Macro and Reflexivity | Skepticism, Real Assets |
| DeepContrarianMispricing | Contrarian and Forensic | Skepticism, Quality |
| SpecialSituationsCatalyst | Contrarian and Forensic | Growth and Disruption, Valuation Bridge |
| CapitalAllocationQuality | Quality and Duration | Contrarian, Skepticism |
| MarketStructureReflexivity | Macro and Reflexivity | Skepticism, Real Assets |
| TechnologyDisruption | Growth and Disruption | Skepticism, Valuation Bridge |
| RegulatoryPolicy | Macro and Reflexivity | Contrarian, Skepticism |
| IndustryStructureConsumerBehavior | Quality and Duration | Skepticism, Contrarian |
| CapitalCycle | Real Assets and Cycles | Macro, Quality |
| OperationalTurnaround | Contrarian and Forensic | Quality, Valuation Bridge |
| RealEstatePhysicalAssets | Real Assets and Cycles | Macro, Quality |
| Geopolitical | Macro and Reflexivity | Real Assets, Skepticism |
| ShortHedgeThesis | Contrarian and Forensic | Skepticism, Macro |
| HouseholdAllocationDecision | Quality and Duration | Real Assets, Skepticism |

### Step 2: Select 2 voices from primary cluster

Pick the 2 most relevant voices from the primary cluster based on the specific thesis mechanics. Document which voices were chosen and why.

### Step 3: Select 1 voice from secondary cluster

Pick 1 voice from the highest-priority secondary cluster.

### Step 4: Apply mandatory rules (in order)

**Rule A — Mandatory Skeptic**: At least one voice from Cluster 2 must be on every panel.
- Default: Munger
- If thesis is narrative-heavy or conviction appears anchored: Kahneman
- If thesis risks being a disguised factor bet: Asness
- If Cluster 2 already represented in Steps 2-3: rule satisfied

**Rule B — Mandatory Valuation Bridge**: Damodaran is added for any thesis at Pressure Test stage or beyond, unless a voice is already explicitly handling narrative-to-numbers translation. Not added for hedge theses.

**Rule C — Prologis Lens Trigger**: Zell is added when Prologis-Aware or Compare vs Prologis lens is active AND thesis touches real assets, industrial real estate, logistics, supply chain, or concentrated holding decisions.

**Rule D — Household Allocation Rule**: When thesis type is HouseholdAllocationDecision, panel must include Klarman (capital preservation voice). Synthesis must explicitly separate the investment question from the allocation question.

**Rule E — Short/Hedge Mandatory**: When thesis type is ShortHedgeThesis, panel must include either Greenblatt or Klarman for capital structure and trigger analysis.

**Rule F — Real Asset Accounting**: When a real asset thesis depends on accounting nuance (decommissioning, depreciation, off-balance-sheet liabilities), Burry is added.

**Rule G — Portfolio Hedge Panel Override**: For portfolio hedge theses, ignore standard selection. Use fixed panel: Klarman, Marks, Asness, Kahneman.

**Rule H — Portfolio Review Panel Override**: For Portfolio Review Panel (cross-thesis correlation), use fixed panel: Marks, Druckenmiller, Asness, Munger, Kahneman. Add Zell if Prologis-Aware and real asset concentration is significant.

### Step 5: Apply panel coverage disclosure

After selection is complete, assess whether the bench has acknowledged weakness in the thesis domain:
- Deep technical specialization (biology, physics, engineering)
- Geopolitical durability
- Regulatory specificity beyond financial services

If weak coverage exists, add to the panel's structuralFactsLayer field: "Panel coverage is limited on [domain]. Panel skepticism may reflect domain limitations rather than thesis weakness."

---

## Per-Voice Output Structure

Every voice produces exactly these six fields. No exceptions.

```typescript
interface VoiceContribution {
  voiceId: ExpertVoiceId
  lensApplied: string            // "Business quality and duration lens"
  verdict: 'Endorse' | 'Challenge' | 'Reject' | 'Reframe'
  coreArgument: string           // 2-4 sentences in the voice's characteristic reasoning style
  primaryMispricedVariableFocus: MispricedVariable
  whatWouldChangeVerdict: string // specific evidence or development that would flip them
  confidence: 'High' | 'Medium' | 'Low'
  scenarioProbabilities?: {      // optional, for Narrative Scenario Framework integration
    thesisConfirmed: number
    contestedPath: number
    thesisBroken: number
  }
}
```

Verdict definitions:
- **Endorse**: the voice agrees the thesis is investable and the expression is appropriate
- **Challenge**: the voice sees validity in the thesis but has significant reservations about specific assumptions or timing
- **Reject**: the voice believes the thesis is wrong on a core assumption or the risk-reward is unfavorable
- **Reframe**: the voice accepts the underlying observation but believes the thesis as structured is the wrong way to express it

---

## Panel Synthesis Output Structure

After individual contributions, produce panel synthesis with these eight fields exactly.

```typescript
interface PanelSynthesis {
  verdictDistribution: { endorse: number; challenge: number; reject: number; reframe: number }
  convergencePoints: string[]    // where panel agrees across opposing verdicts
  divergencePoints: string[]     // where panel splits and on which variable
  strongestArgumentFor: string   // most compelling endorsing case
  strongestArgumentAgainst: string // most compelling challenging/rejecting case
  mostContestedVariable: MispricedVariable
  whatWouldResolveDisagreement: string
  panelPosture: 'Constructive' | 'Mixed' | 'Skeptical' | 'Hostile'
  panelProbabilityMatrix?: {     // when scenario probabilities provided
    thesisConfirmed: number      // weighted average across voices
    contestedPath: number
    thesisBroken: number
  }
}
```

---

## Research View vs Panel Reconciliation

This is produced after both the Research View and Expert Synthesis View exist. It is the actual decision-relevant output — the two views are inputs to it.

```typescript
interface ResearchPanelReconciliation {
  agreements: string[]
  disagreements: string[]
  contestedVariable: MispricedVariable
  strongerEvidenceBase: 'ResearchView' | 'PanelView' | 'Unclear'
  lifecycleImplication: string    // what this means for lifecycle stage
  triggerReadinessImplication: string
}
```

---

## System Prompt Pattern for Expert Synthesis API Call

```typescript
const buildExpertSynthesisPrompt = (
  thesis: Thesis,
  selectedVoices: ExpertVoiceId[],
  voiceDefinitions: typeof EXPERT_BENCH
): string => `
You are the Expert Synthesis View for a thesis-first investment system.

Your job: Produce a structured adversarial panel analysis for the following thesis.
You will voice ${selectedVoices.length} specific investors, each with a distinct cognitive module.
Every voice must use the six-field output structure. No exceptions.

THESIS:
${JSON.stringify(thesis, null, 2)}

PANEL COMPOSITION:
${selectedVoices.map(v => `${v}: ${voiceDefinitions[v].module}`).join('\n')}

RULES:
1. Each voice must stay in their specific cognitive module. Do not let voices drift into other modules.
2. Each voice must produce a Verdict (Endorse | Challenge | Reject | Reframe).
3. After individual contributions, produce the Panel Synthesis in the eight-field structure.
4. After Panel Synthesis, produce the Research View vs Panel Reconciliation.
5. The mandatory skeptic must make the hardest possible case against the thesis.
6. Respond ONLY with valid JSON. No preamble, no markdown, no explanation.

OUTPUT FORMAT:
{
  "contributions": [...VoiceContribution[]],
  "panelSynthesis": {...PanelSynthesis},
  "reconciliation": {...ResearchPanelReconciliation}
}
`
```

---

## Display Rules

1. Panel composition displayed at top of every Expert Synthesis View, with which rules triggered which voice
2. Panel synthesis appears before individual voice contributions (summary first)
3. Individual voice contributions are expandable (progressive disclosure)
4. Verdict (Endorse | Challenge | Reject | Reframe) shown as primary visual signal — colored badge
5. Most contested variable surfaced prominently
6. Panel posture (Constructive | Mixed | Skeptical | Hostile) shown as a section header
7. Reconciliation with Research View always visible, never hidden behind a click
8. Coverage disclosure (if present) shown as an amber banner above the panel

---

## Governance Rules

1. The bench is fixed at 18 voices. Adding or removing requires user approval and creates a change log entry.
2. Selection logic learns from post-mortems but adjusts confidence weights, not the bench itself.
3. Each voice has a defined cognitive module. The system must not let a voice drift into a different module.
4. User can override panel selection at any time. Overrides are logged and tracked for outcome comparison.
5. For reassessment panels (triggered by Conviction Decay), the panel evaluates current thesis state, not original underwriting.

---

## Stress-Test Derived Adjustments (All Locked)

From the nine stress tests conducted in the design session, these eight adjustments are incorporated:

1. Industry structure and capital cycle are separate thesis types with different cluster mappings
2. Real Assets cluster explicitly includes energy, industrial infrastructure, and physical assets beyond real estate
3. Household allocation theses require Klarman and explicit separation of investment vs allocation question
4. Panel coverage disclosure distinguishes thesis weakness from panel limitation
5. Structural facts layer (liquidity, position size, execution risk, time-to-close) is mandatory on every panel
6. Short/hedge theses require Greenblatt or Klarman
7. Macro regime compatibility score is a standing input to every panel convened at Actionable stage or beyond
8. Portfolio hedge theses use fixed panel (Klarman, Marks, Asness, Kahneman)
