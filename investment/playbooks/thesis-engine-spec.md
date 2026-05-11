# Thesis Engine Specification
**Document:** `thesis-engine-spec.md`
**Location:** `/investment/playbooks/`
**Version:** 1.0
**Status:** Authoritative
**Scope:** Dossier UI product behavior — Investment zone analytical mechanics

---

> This document governs all analytical mechanics operating within the Dossier UI. It is referenced by but does not duplicate `CLAUDE.md`, which governs vault behavior (Obsidian + Git + Claude Code). When this spec and `CLAUDE.md` conflict, `CLAUDE.md` is authoritative on vault matters; this spec is authoritative on UI product behavior.

---

## Table of Contents

1. [Dossier Context & Layout](#1-dossier-context--layout)
2. [Thesis Pipeline](#2-thesis-pipeline)
3. [18-Voice Expert Synthesis Bench](#3-18-voice-expert-synthesis-bench)
4. [Signal Aggregation Engine](#4-signal-aggregation-engine)
5. [Conviction Decay Mechanism](#5-conviction-decay-mechanism)
6. [AI-Triggered Conviction Comparison](#6-ai-triggered-conviction-comparison)
7. [Kill Protocol](#7-kill-protocol)
8. [Full Underwriting Memo](#8-full-underwriting-memo)
9. [Human Approval Requirements](#9-human-approval-requirements)
10. [Prologis Context Integration](#10-prologis-context-integration)

---

## 1. Dossier Context & Layout

### 1.1 Top-Level Tab Switcher

Dossier operates in three persistent view modes, toggled via a tab switcher anchored at the top of every screen:

| Tab | Description |
|-----|-------------|
| **Standalone** | Personal portfolio and investment work, independent of Prologis |
| **Prologis-Aware** | Personal work enriched with Prologis domain intelligence — macros, deal flow, sector exposure — without conflating assets |
| **vs Prologis** | Side-by-side comparison mode: personal thesis or position benchmarked against Prologis corporate posture, NAV, or pipeline |

Tab context persists across session and is stamped on all agent outputs (memos, conviction entries, kill records) to preserve context provenance.

### 1.2 Macro Regime Bar

A persistent horizontal bar appears beneath the tab switcher on all screens. It is never hidden or collapsed.

**Displays:**
- Active macro regime label (e.g., "Late Cycle / Rates Elevated / USD Strong")
- Regime confidence score (0–100)
- Days since last regime reassessment
- Regime-to-thesis compatibility indicator (per active thesis)

**Behavior:**
- Regime label and score are agent-maintained; user can override with a manual regime declaration
- Compatibility indicator is computed per thesis using the Macro Regime Compatibility Score defined in Section 8 (Underwriting Memo, §8.15)
- Regime bar does not gate any action; it is informational and advisory

### 1.3 Prologis Domain Context

Will Jarvis is Head of Corporate Development and Growth at Prologis — the world's largest industrial REIT, owning and operating approximately 1.3 billion square feet of logistics and industrial real estate globally.

Active Prologis domains relevant to Dossier analytical mechanics:
- **Solar / Private Energy:** Rooftop and ground-mount solar, on-site generation, energy-as-a-service
- **Warehouse Operations:** Automation, robotics, labor efficiency, cold chain
- **Supply Chain Intelligence:** Demand sensing, nearshoring, port adjacency, inventory positioning
- **Nuclear Power:** Advanced fission, SMRs, baseload decarbonization

Investment work spans both personal portfolio and Prologis corporate development. Dossier must maintain clean separation between the two while enabling cross-pollination of intelligence in Prologis-Aware and vs Prologis tabs.

---

## 2. Thesis Pipeline

### 2.1 Stage Definitions

Every thesis moves through a linear pipeline. Stages are explicit and named. Regression to earlier stages is permitted.

```
Signal → Hypothesis → PressureTest → Actionable → Watch → Live
```

| Stage | Description | Entry Criteria |
|-------|-------------|----------------|
| **Signal** | A raw observation, data point, or market event flagged for investigation | Any tagged signal above composite threshold (see §4.3) |
| **Hypothesis** | A structured directional claim with a named primary variable and at least one falsifiable condition | Signal elevated by user; primary variable defined |
| **PressureTest** | Active adversarial interrogation; Expert Bench and Kill Protocol eligibility begins | Hypothesis formed; underwriting memo initiated |
| **Actionable** | Thesis has survived pressure test; position sizing or monitoring cadence defined | PressureTest complete; no active kill triggers |
| **Watch** | Thesis is live but in observation mode; conviction may be decaying | Position entered or decision pending; decay clock active |
| **Live** | Full active position with ongoing monitoring | Capital deployed or commitment made |

### 2.2 Stage Transitions

- **Forward transitions** are agent-suggested, user-confirmed
- **Backward regressions** may be agent-triggered (on kill pathway activation or decay threshold breach) or user-initiated
- Stage history is immutable in the vault; regressions are new entries, not overwrites
- Every stage transition generates a timestamped audit entry

### 2.3 Pipeline View in Dossier

The pipeline is rendered as a kanban-style board with thesis cards. Each card displays:
- Thesis name and primary variable
- Current stage
- Conviction score (0–100)
- Decay clock status
- Days in current stage
- Active signal count
- Kill trigger status (none / warning / active)

---

## 3. 18-Voice Expert Synthesis Bench

### 3.1 Purpose

The Expert Bench is a structured multi-perspective analytical framework. Rather than a single AI-generated view, the agent synthesizes analysis from 18 locked expert archetypes, each with a defined lens, bias, and adversarial posture. This is not a real-time panel — it is a structured prompt architecture that forces multi-angle interrogation of every thesis.

### 3.2 Bench Composition (Locked)

Selection logic is fixed. The 18 voices are not user-configurable. They are:

| # | Voice | Primary Lens | Adversarial Posture |
|---|-------|-------------|---------------------|
| 1 | **The Macro Strategist** | Global rates, FX, liquidity cycles | Skeptical of micro-driven theses in macro-hostile regimes |
| 2 | **The Short Seller** | Accounting quality, hidden liabilities, narrative inflation | Actively seeks thesis destruction |
| 3 | **The Private Equity Operator** | Operational leverage, cost structure, management quality | Skeptical of public market valuations |
| 4 | **The Venture Capitalist** | Optionality, market size, founder-market fit | Skeptical of terminal value assumptions |
| 5 | **The Credit Analyst** | Debt capacity, covenant structure, refinancing risk | Prioritizes downside over upside |
| 6 | **The Quantitative Strategist** | Factor exposure, momentum, mean reversion signals | Skeptical of qualitative narratives |
| 7 | **The Geopolitical Risk Analyst** | Regulatory risk, sanctions exposure, political economy | Skeptical of globalization assumptions |
| 8 | **The Real Estate Specialist** | Cap rates, NOI quality, lease duration, tenant credit | Prologis-informed; industrial REIT lens |
| 9 | **The Energy Sector Analyst** | Energy transition, stranded asset risk, power markets | Grid-aware; solar/nuclear literate |
| 10 | **The Supply Chain Strategist** | Inventory cycles, nearshoring dynamics, logistics cost curves | Demand-side skeptic |
| 11 | **The ESG / Regulatory Risk Monitor** | Carbon exposure, disclosure risk, ESG premium/discount | Forward regulatory-policy scanner |
| 12 | **The Behavioral Finance Critic** | Narrative bias, anchoring, confirmation risk in thesis framing | Targets Will's own stated conviction |
| 13 | **The Technologist** | Disruption risk, technology adoption curves, platform dynamics | Assumes incumbents are more fragile than they appear |
| 14 | **The Emerging Markets Specialist** | Currency risk, EM contagion, cross-border capital flows | Applies EM skepticism to developed market theses |
| 15 | **The Activist Investor** | Capital allocation quality, governance failure, shareholder return | Targets management complacency |
| 16 | **The Deep Value Analyst** | Asset coverage, normalized earnings, cycle-adjusted valuation | Skeptical of growth premium |
| 17 | **The Narrative Economist** | Story coherence, market consensus positioning, reflexivity | Identifies when thesis is already priced |
| 18 | **The Risk Manager** | Tail risk, correlation in stress, portfolio-level impact | Last-line-of-defense; veto-weighted voice |

### 3.3 Activation Logic

The Expert Bench is activated at **PressureTest** stage entry and on any **Forced Reassessment** trigger. It runs automatically on:
- Initial thesis pressure test
- Conviction decay threshold breach (see §5.3)
- Kill pathway activation review (see §7)
- User-requested re-interrogation

### 3.4 Output Format

Each voice produces:
- A 2–4 sentence structured assessment
- A stance label: **Supportive / Neutral / Skeptical / Hostile**
- Up to 3 specific falsifiable concerns or validating observations
- A kill recommendation: **Hold / Flag / Kill**

The agent then produces a **Bench Synthesis** — a single consolidated view that:
- Counts stance distribution (e.g., 9 Supportive / 5 Neutral / 3 Skeptical / 1 Hostile)
- Surfaces the 3 highest-severity concerns regardless of majority stance
- Notes if the Risk Manager (Voice 18) issued a Kill recommendation (veto-weighted — always surfaces to the top)
- Produces an overall bench confidence score (0–100), computed as a weighted average across voices with Voice 18 at 2× weight

### 3.5 Locked Selection Rationale

The 18-voice composition is locked because:
- Consistency across theses enables meaningful comparison over time
- Prevents survivor bias in expert selection (only calling voices that confirm the thesis)
- The Behavioral Finance Critic (Voice 12) is specifically designed to challenge Will's own framing — this is only effective if it cannot be deactivated
- The Risk Manager (Voice 18) serves as a system-level check that should not be conditional on thesis type

User may not add, remove, or reorder voices. User may request a supplemental "Domain Deep Dive" — a non-bench, one-time invocation of up to 3 additional domain-specific perspectives — but this output is clearly labeled as supplemental and does not affect the bench confidence score.

---

## 4. Signal Aggregation Engine

### 4.1 Purpose

The Signal Aggregation Engine processes incoming information — news, data releases, conversations, filings, market moves, proprietary observations — and produces structured, weighted composite scores that quantify evidential support for or against an active thesis.

### 4.2 Variable Tagging

Every signal ingested by the engine must be tagged before scoring.

**Required tags:**

| Tag Type | Description | Examples |
|----------|-------------|---------|
| **Primary Variable** | Which thesis primary variable does this signal address? | `cap_rate_compression`, `solar_adoption_rate`, `nearshoring_velocity` |
| **Directionality** | Does this signal support or contradict the thesis? | `confirming`, `contradicting`, `ambiguous` |
| **Source Class** | What category of source? | `primary_data`, `sell_side`, `mgmt_commentary`, `regulator`, `proprietary`, `news` |
| **Specificity** | How directly does this apply to the thesis? | `direct`, `adjacent`, `tangential` |
| **Signal Type** | What kind of information? | `quantitative`, `qualitative`, `event`, `revision` |
| **Domain** | Prologis domain relevance (optional) | `solar`, `warehouse_ops`, `supply_chain`, `nuclear`, `none` |

Tags are applied by the agent on ingestion. User may override any tag.

### 4.3 Weighting Model

Each signal receives a composite weight score computed as:

```
Signal Weight = Source Quality Score × Specificity Multiplier × Recency Decay Factor
```

**Source Quality Score (0–1.0):**

| Source Class | Base Score |
|-------------|-----------|
| Proprietary / primary data (Will's direct observation) | 1.0 |
| Regulatory filings, government data | 0.90 |
| Earnings transcripts, management commentary | 0.75 |
| Tier 1 sell-side research (named analyst, named firm) | 0.65 |
| Tier 2 sell-side / industry research | 0.50 |
| News (named journalist, named outlet with track record) | 0.45 |
| Anonymous / aggregator / secondary | 0.25 |

**Specificity Multiplier:**

| Specificity | Multiplier |
|-------------|-----------|
| Direct (addresses primary variable explicitly) | 1.0 |
| Adjacent (same sector/domain, relevant but indirect) | 0.65 |
| Tangential (macro or thematic, weak link) | 0.35 |

**Recency Decay Factor:**

Decay is continuous, not stepped. Formula:

```
Recency Decay = e^(-λ × days_since_signal)

Where λ (decay constant) is thesis-class dependent:
  - Fast-cycle thesis (commodity, momentum, event-driven): λ = 0.015
  - Medium-cycle thesis (sector rotation, real estate cycle): λ = 0.007
  - Long-cycle thesis (infrastructure, demographic, energy transition): λ = 0.003
```

Thesis class is set at Hypothesis stage by the user and governs signal decay cadence.

### 4.4 Composite Score Engine

The Composite Score aggregates all active signals into a single evidential weight for each side of the thesis.

```
Confirming Score = Σ (Weight_i) for all confirming signals
Contradicting Score = Σ (Weight_j) for all contradicting signals
Net Conviction Signal = Confirming Score − Contradicting Score
Composite Signal Ratio = Confirming Score / (Confirming Score + Contradicting Score)
```

**Composite Signal Ratio interpretation:**

| Ratio | Label | Action |
|-------|-------|--------|
| > 0.75 | Strong Confirming | Surfaces as conviction support |
| 0.55–0.75 | Moderate Confirming | No action required |
| 0.45–0.55 | Contested | Evidence Drift Monitor activates |
| 0.25–0.45 | Moderate Contradicting | Decay Clock accelerates (see §5.1) |
| < 0.25 | Strong Contradicting | Kill Protocol signal threshold trigger eligible (see §7.2) |

### 4.5 Convergence and Divergence Detection

The engine monitors signal clustering patterns beyond the simple ratio:

**Convergence** is detected when:
- Three or more signals of different source classes arrive within a 14-day window
- All are tagged `confirming` or all are tagged `contradicting`
- At least one is `direct` specificity
- Signal output: `CONVERGENCE_ALERT` — surfaced to user as notable, not actionable without user review

**Divergence** is detected when:
- Signals from two or more source classes conflict in directionality within a 14-day window
- The contradicting signal has a higher Source Quality Score than the confirming signal
- Signal output: `DIVERGENCE_ALERT` — surfaced immediately; triggers Evidence Drift Monitor activation (see §5.2)

Both alerts are surfaced in the Macro Regime Bar signal feed and in the thesis card signal indicator.

---

## 5. Conviction Decay Mechanism

### 5.1 Decay Clock

The Decay Clock is a time-based conviction erosion mechanism. It activates when a thesis enters **Watch** or **Live** stage and runs continuously.

**Mechanism:**

```
Conviction Score at time t = Conviction Score at t₀ × e^(-δ × t)

Where δ (conviction decay constant) = base_decay × signal_ratio_modifier × regime_compatibility_modifier

base_decay (per thesis class):
  - Fast-cycle: 0.012 per day
  - Medium-cycle: 0.005 per day
  - Long-cycle: 0.002 per day

signal_ratio_modifier:
  - Strong Confirming (>0.75): 0.5× (decay slows)
  - Contested (0.45–0.55): 1.5× (decay accelerates)
  - Strong Contradicting (<0.25): 3.0× (decay heavily accelerates)

regime_compatibility_modifier:
  - Regime compatible (score > 70): 0.8× (decay slows)
  - Regime neutral (40–70): 1.0×
  - Regime hostile (score < 40): 1.4× (decay accelerates)
```

**Decay Clock Display:** Rendered on each thesis card as a visual clock and numeric score. Color shifts: green (>70), amber (50–70), red (<50).

**Conviction Score Floor:** 10. A thesis cannot decay below 10; at floor, Forced Reassessment Protocol is mandatory before any further position action.

### 5.2 Evidence Drift Monitor

The Evidence Drift Monitor tracks directional shift in the signal evidence base over time — not the instantaneous signal ratio, but the trend.

**Activation:** Automatic when a thesis enters PressureTest, Watch, or Live stage.

**Calculation:**

The monitor computes a rolling 30-day window of the Net Conviction Signal (§4.4) and compares it to the prior 30-day window.

```
Evidence Drift = (Net Conviction Signal, current 30d) − (Net Conviction Signal, prior 30d)
```

**Drift Thresholds:**

| Drift Value | Status | Action |
|-------------|--------|--------|
| Positive drift > +0.15 | Strengthening | No action |
| −0.10 to +0.15 | Stable | No action |
| −0.10 to −0.25 | Drifting | Surface warning; increase monitoring cadence |
| < −0.25 | Significant Drift | Evidence Drift Alert; Trigger Proximity Tracker activates |

### 5.3 Trigger Proximity Tracker

The Trigger Proximity Tracker quantifies how close a thesis is to crossing defined kill thresholds or conviction floors. It is activated by Significant Drift status or manual activation.

**Tracked Dimensions:**

| Dimension | Metric | Warning Threshold | Kill Threshold |
|-----------|--------|------------------|----------------|
| Signal Ratio | Composite Signal Ratio | < 0.35 | < 0.25 |
| Conviction Score | Decay Clock output | < 50 | < 20 |
| Evidence Drift | 30d drift | < −0.20 | < −0.35 |
| Regime Compatibility | Macro Regime Compatibility Score | < 45 | < 30 |
| Bench Hostility | % of voices at Skeptical/Hostile | > 55% | > 75% |

**Display:** Renders as a 5-axis radar chart on the thesis detail view. Each axis shows current position and threshold markers. Color-coded: green (safe) / amber (warning) / red (kill zone).

**Proximity Alert:** When any dimension enters Warning Threshold, user receives a non-blocking notification. When any dimension crosses Kill Threshold, Kill Protocol signal threshold pathway activates (see §7.2).

### 5.4 Forced Reassessment Protocol

The Forced Reassessment Protocol is a mandatory structured review triggered by one of three conditions:
1. Conviction Score decays to floor (10)
2. Any Kill Threshold breach (from Trigger Proximity Tracker)
3. Thesis reaches 180 days in Watch or Live stage without a conviction update

**Protocol steps (agent-executed, user-supervised):**

1. **Freeze:** No new position actions may be logged until reassessment is complete
2. **Expert Bench Re-run:** Full 18-voice bench invocation with current signal state
3. **Evidence Audit:** Agent lists all active signals, recalculates weights, flags stale signals (>90 days old in fast-cycle theses, >180 days in long-cycle)
4. **Narrative Scenario Refresh:** Agent regenerates Bear, Base, Bull, and Black Swan scenarios (see §8.12) against current data
5. **Kill/Hold/Upgrade Decision:** Agent presents a structured recommendation: Kill (pathway specified), Hold with conditions, or Upgrade conviction with new primary variable assumptions
6. **User Decision:** User reviews and confirms one of the three options. No automatic outcome — agent recommendation only

---

## 6. AI-Triggered Conviction Comparison

### 6.1 Purpose

When a new signal lands tagged to an active thesis, the agent compares it against the thesis's original primary variable assumptions, identifies the magnitude and direction of any delta, drafts a conviction update entry for the ledger, and surfaces it for Will's explicit approval before any entry is written.

**No conviction ledger entry is written without explicit user confirmation.** This rule has no exceptions.

### 6.2 Trigger Conditions

A conviction comparison is triggered when all of the following are true:
- A new signal is ingested and tagged to an active thesis
- The signal's Primary Variable tag matches one of the thesis's defined primary or secondary variables
- The signal's Specificity tag is `direct` or `adjacent` (not `tangential`)
- The signal's Source Quality Score is ≥ 0.45

A signal meeting all conditions triggers an automatic conviction comparison run. The agent does not wait for user initiation.

### 6.3 Comparison Process

**Step 1 — Original Assumption Retrieval**
The agent retrieves the thesis's original primary variable assumption as stated at Hypothesis formation (immutable vault record).

**Step 2 — Current State Assessment**
The agent evaluates the primary variable's current state based on:
- The incoming signal
- All active signals tagged to the same variable (weighted per §4.3)
- Current composite score for that variable

**Step 3 — Delta Identification**
The agent identifies and categorizes the delta:

| Delta Category | Definition |
|----------------|-----------|
| **Confirming — Minor** | Current state aligns with original assumption; signal adds incremental support; conviction unchanged |
| **Confirming — Material** | Current state aligns and strengthens the original assumption; conviction upgrade warranted |
| **Neutral** | Signal is relevant but does not directionally update the assumption |
| **Contradicting — Minor** | Current state partially diverges from original assumption; conviction slight reduction warranted |
| **Contradicting — Material** | Current state substantially diverges; conviction meaningful reduction warranted |
| **Thesis-Altering** | Original assumption is invalidated or reversed; kill pathway or full reassessment warranted |

**Step 4 — Conviction Update Draft**
The agent drafts a conviction ledger entry containing:
- Signal summary (what was observed)
- Delta category
- Original assumption text (quoted, immutable)
- Current state assessment
- Proposed conviction score change (numeric delta, e.g., −8 points)
- Agent reasoning (2–4 sentences)
- Recommended action: Log Only / Log + Flag / Log + Initiate Kill Review

**Step 5 — User Presentation**
The draft entry is presented in a review modal within Dossier. The user sees:
- The full draft
- A confirmation button: **Confirm & Write to Ledger**
- An edit button: **Edit Before Confirming**
- A rejection button: **Discard**

**Step 6 — Outcome**
- **Confirm:** Entry written to vault with timestamp and user confirmation flag
- **Edit then Confirm:** User-edited version written; original draft preserved as a sub-record
- **Discard:** No entry written; signal remains in signal feed as unprocessed; user may return to it later

### 6.4 Ledger Entry Format

A confirmed conviction ledger entry contains:

```markdown
## Conviction Update — [Date]

**Thesis:** [Thesis Name]
**Stage:** [Current Stage]
**Trigger Signal:** [Signal title and source]
**Delta Category:** [Category from §6.3]

**Original Assumption:**
> [Quoted verbatim from Hypothesis record]

**Current State Assessment:**
[Agent's 2–4 sentence assessment]

**Proposed Score Change:** [+/− N points] → New Score: [X]

**Agent Reasoning:**
[2–4 sentences]

**Recommended Action:** [Log Only / Log + Flag / Log + Initiate Kill Review]

**Confirmed by:** Will Jarvis
**Confirmation timestamp:** [ISO 8601]
```

---

## 7. Kill Protocol

### 7.1 Overview

The Kill Protocol governs the structured retirement of a thesis. Thesis retirement is never automatic. The agent may activate a kill pathway and generate a kill memo, but the final kill confirmation requires explicit user action.

### 7.2 Four Kill Pathways

| Pathway | Trigger | Description |
|---------|---------|-------------|
| **1. Forced Reassessment** | Conviction floor breach (Score ≤ 10) or 180-day Watch/Live without update | Mandatory reassessment; kill is one of three possible outcomes |
| **2. Signal Threshold** | Composite Signal Ratio < 0.25 sustained for 14+ days | Evidence base has overwhelmingly turned; kill recommendation generated |
| **3. User-Initiated** | User explicitly selects "Kill This Thesis" from thesis card or detail view | No trigger required; user may kill at any stage for any reason |
| **4. Lifecycle Expiry** | Thesis remains at Hypothesis or PressureTest stage for > 90 days without stage advancement | Thesis is presumed stale; kill or archive recommendation generated |

### 7.3 Five Kill Types

Each kill memo must specify one of five kill types. The kill type shapes the learning extraction and future thesis construction:

| Kill Type | Definition | Learning Signal |
|-----------|-----------|----------------|
| **Thesis Wrong** | Primary variable assumption was incorrect; the predicted outcome did not occur | Primary variable re-evaluation; signal sourcing review |
| **Thesis Right, Timing Wrong** | The thesis was directionally correct but the market did not confirm within the expected horizon | Cycle timing calibration; patience vs. conviction review |
| **Thesis Right, Execution Wrong** | The thesis was correct but position sizing, entry timing, or instrument selection produced poor outcomes | Execution framework review |
| **External Invalidation** | An exogenous event (regulatory change, geopolitical shock, force majeure) invalidated the thesis in a way that could not have been predicted | No primary variable error; external event log |
| **Preempted** | A competing opportunity with higher conviction or better risk/reward warranted capital reallocation | Opportunity cost framework; portfolio construction review |

### 7.4 Kill Memo

Every thesis kill generates a kill memo. The memo is drafted by the agent and confirmed by the user before being written to the vault.

**Kill Memo Structure:**

```markdown
# Kill Memo — [Thesis Name]

**Kill Date:** [Date]
**Kill Pathway:** [Pathway 1–4]
**Kill Type:** [Type from §7.3]
**Days Active:** [From Signal stage entry to kill date]
**Final Conviction Score:** [0–100]
**Final Stage:** [Stage at time of kill]

---

## Thesis Summary
[2–3 sentence summary of what the thesis claimed]

## Primary Variable at Inception
[Original assumption, quoted]

## Primary Variable at Kill
[Current state of the variable]

## What the Evidence Said
[Summary of signal history: confirming signals, contradicting signals, key convergence/divergence events]

## Expert Bench Final Stance
[Final bench stance distribution and top 3 concerns surfaced]

## Why This Thesis Is Being Killed
[2–4 sentences: specific kill reason tied to kill pathway and type]

## What the Thesis Got Right
[Honest assessment of valid elements]

## What the Thesis Got Wrong
[Honest assessment of failures]

## Learning Extraction
[See §7.5]

---

**Kill confirmed by:** Will Jarvis
**Confirmation timestamp:** [ISO 8601]
```

### 7.5 Learning Extraction

Every kill memo includes a structured learning extraction section. This section feeds the Investment zone's institutional memory and informs future thesis construction.

**Learning Extraction contains:**

1. **Primary Failure Mode** — one of: Assumption Error / Signal Misread / Timing Failure / Execution Failure / External Shock / None (right thesis, wrong conditions)
2. **Signal Quality Audit** — which source classes and specific signals proved most/least predictive
3. **Expert Voice Accuracy** — which of the 18 voices called the outcome correctly; which missed
4. **Regime Context** — what macro regime was active; was it compatible or hostile to the thesis
5. **Watch for Next Time** — 2–3 specific conditions to monitor more closely in future similar theses
6. **Archive Flag** — should this thesis be archived as a reference case for future similar theses? (Boolean; user-confirmed)

---

## 8. Full Underwriting Memo

### 8.1 Purpose

The Full Underwriting Memo is the definitive written record of a thesis at PressureTest stage. It is generated by the agent, reviewed and edited by the user, and locked at Actionable stage advancement. Post-lock edits are tracked as amendments, not overwrites.

### 8.2 Generation Trigger

The Underwriting Memo is initiated when a thesis advances to PressureTest. The agent generates a draft from:
- Signal history and composite scores
- Primary and secondary variable definitions
- Expert Bench output
- Current macro regime

User reviews, edits, and confirms the memo. Confirmation is required before stage advancement to Actionable.

### 8.3 Memo Structure — 15 Sections

---

#### §8.1 — Thesis Statement
One declarative sentence stating the thesis. Format: "We believe [X] will [direction/outcome] due to [primary variable], over [horizon], under [regime conditions]."

---

#### §8.2 — Primary Variable Definition
The single most important variable that must move for the thesis to be correct. Includes:
- Current measured state
- Required directional change
- Measurement method (how will we know if the variable has moved?)
- Minimum threshold for confirmation

---

#### §8.3 — Secondary Variables
Up to 5 supporting variables that are necessary but not sufficient for thesis success. Each includes:
- Variable name
- Current state
- Required direction
- Weight in overall thesis confidence (must sum to ≤ 50%; primary variable owns the remainder)

---

#### §8.4 — Falsification Conditions
Explicit, pre-committed statements of what would prove this thesis wrong. Minimum of 3. These are immutable once the memo is locked — they cannot be revised to accommodate new contradicting evidence. Format: "If [observable condition] occurs, this thesis is falsified."

---

#### §8.5 — Variant Perception Framework
Articulates specifically where the thesis disagrees with consensus and why. Three components:

1. **Consensus View** — what does the market / sell-side / mainstream believe about this primary variable?
2. **Thesis View** — how does Will's view differ?
3. **Why the Consensus Is Wrong** — what does the thesis see that consensus does not? This must cite specific evidence, not general intuition.

The variant perception is the intellectual core of the thesis. A thesis with no variant perception is not a thesis — it is a consensus bet.

---

#### §8.6 — Catalyst Map
A structured list of events or conditions that could cause the market to move toward the thesis view. Each catalyst includes:
- Description
- Estimated probability (Low / Medium / High)
- Estimated timing (Fast-cycle / Medium-cycle / Long-cycle aligned)
- Impact on primary variable if realized

---

#### §8.7 — Risk Register
A structured list of risks that could prevent or reverse thesis realization. Minimum of 5. Each risk includes:
- Description
- Probability (Low / Medium / High)
- Severity (Minor / Moderate / Severe / Thesis-Fatal)
- Mitigation (what would reduce this risk; what would we watch to detect early?)

---

#### §8.8 — Position Sizing Framework
Recommended position sizing logic given conviction level, risk register severity distribution, and portfolio context. Includes:
- Conviction-scaled position size (% of investable portfolio)
- Maximum position size given thesis-fatal risk count
- Scaling schedule: initial entry / conviction confirmation add / full position threshold
- Stop framework: at what conviction score or signal ratio does position reduction begin?

This section is advisory. Actual position decisions require user confirmation.

---

#### §8.9 — Liquidity and Instrument Analysis
Assessment of available instruments and their liquidity characteristics:
- Primary instrument(s)
- Liquidity profile (bid/ask, average daily volume, lock-up if private)
- Instrument-specific risks (derivative decay, leverage cost, lock-up risk)
- Prologis corporate development instrument options (if Prologis-Aware tab is active)

---

#### §8.10 — Comparable Theses / Historical Analogues
Up to 3 historical analogues from Will's own thesis history (vault) or canonical market history:
- Analogue description
- Similarity to current thesis
- Outcome
- Key lesson

---

#### §8.11 — Prologis Overlay
*(Required when Prologis-Aware or vs Prologis tab is active; optional in Standalone.)*

- How does this thesis relate to Prologis's active corporate development domains?
- Does Prologis's scale and information advantage inform the thesis (confirming edge)?
- Does Prologis's own position create a conflict of interest or information asymmetry to monitor?
- Is this a personal portfolio thesis that Prologis might subsequently pursue (preemption risk)?
- Recommended disclosure posture (personal judgment; not legal advice)

---

#### §8.12 — Narrative Scenarios
Four structured scenarios, each with a narrative arc and quantified outcome range:

| Scenario | Trigger | Primary Variable Outcome | Conviction Impact |
|----------|---------|-------------------------|-------------------|
| **Bull** | Catalysts accelerate; risks do not materialize | Primary variable moves to full thesis target | Conviction → 90+ |
| **Base** | Thesis correct but with friction; partial catalyst realization | Primary variable moves to 60–80% of target | Conviction → 70–85 |
| **Bear** | Primary variable does not move; key risk materializes | Primary variable flat or adverse | Conviction decays; kill review triggered |
| **Black Swan** | Exogenous shock invalidates framework | Primary variable structurally altered or destroyed | External Invalidation kill type |

Each scenario includes a brief narrative (3–5 sentences) describing the market environment in which it occurs.

---

#### §8.13 — Monitoring Cadence
Defines the specific data sources, frequencies, and trigger conditions for ongoing thesis monitoring:
- **Weekly:** [specific data sources, e.g., freight indices, energy prices]
- **Monthly:** [earnings releases, government data, fund flows]
- **Event-Driven:** [specific events to watch, e.g., Fed meetings, port data, regulatory filings]
- **Decay Review Cadence:** [frequency of manual conviction score review]

---

#### §8.14 — Open Questions
A structured list of the most important unanswered questions at time of memo lock. Each includes:
- The question
- Why it matters to thesis validity
- How it will be answered (what data or event will resolve it?)
- What the answer implies (if yes → thesis strengthened; if no → thesis weakened/killed)

---

#### §8.15 — Macro Regime Compatibility Score

A 0–100 score representing the degree to which the current and anticipated macro regime supports the thesis.

**Computation inputs:**

| Factor | Weight |
|--------|--------|
| Rate environment compatibility | 20% |
| USD / FX regime compatibility | 15% |
| Credit spread regime | 15% |
| Equity risk premium environment | 15% |
| Sector / factor regime alignment | 20% |
| Geopolitical stability (relevant to thesis domains) | 15% |

The agent scores each factor 0–100 based on current regime data. Weighted composite is displayed on the Macro Regime Bar as the thesis-specific compatibility indicator.

**Score interpretation:**

| Score | Label | Action |
|-------|-------|--------|
| 70–100 | Compatible | Decay modifier favorable |
| 40–69 | Neutral | No modifier |
| 0–39 | Hostile | Decay modifier unfavorable; surfaces in thesis card |

---

## 9. Human Approval Requirements

### 9.1 Non-Negotiable Approval Gates

The following actions require explicit, affirmative user confirmation before execution. No action in this list is automatic or assumed by implication.

| Action | Approval Mechanism |
|--------|-------------------|
| Conviction ledger entry write | Confirm & Write to Ledger button in review modal |
| Underwriting Memo lock | Explicit "Lock Memo" action; unlocks only via amendment flow |
| Thesis stage advancement (forward) | Confirm Stage Advance modal |
| Thesis stage regression (backward) | Confirm Stage Regression modal with reason field |
| Kill Protocol initiation | Confirm Kill Initiation modal |
| Kill Memo write to vault | Confirm Kill Memo button |
| Kill type selection | Explicit selection required; no default |
| Forced Reassessment outcome (Kill / Hold / Upgrade) | Explicit selection required |
| Expert Bench supplemental domain deep dive | User-initiated only |
| Signal tag override | Explicit override action with reason field |

### 9.2 Agent Drafts, Will Confirms

The agent's role in all conviction and kill workflows is:
1. **Detect** the trigger condition
2. **Draft** the entry, memo, or recommendation
3. **Present** it to the user for review
4. **Wait** for explicit confirmation
5. **Write** to vault only upon confirmation

The agent never writes to the conviction ledger, the kill memo record, or any thesis stage record without user confirmation. The agent may surface reminders if a pending draft has not been reviewed after a configurable interval, but does not escalate or auto-confirm.

---

## 10. Prologis Context Integration

### 10.1 Domain Intelligence Routing

When the Prologis-Aware or vs Prologis tab is active, the following domain contexts are enriched into analytical outputs:

| Domain | Active Enrichments |
|--------|-------------------|
| **Solar / Private Energy** | On-site generation economics; grid interconnect timelines; IRA / energy policy developments; utility PPA pricing; rooftop solar penetration on industrial assets |
| **Warehouse Operations** | Automation adoption curves; labor cost trajectories; cold chain expansion; e-commerce demand vs. supply dynamics |
| **Supply Chain Intelligence** | Nearshoring / friend-shoring capital flows; inventory-to-sales ratios; port capacity utilization; container pricing |
| **Nuclear Power** | SMR development timelines; regulatory posture (NRC, DOE); baseload decarbonization economics; corporate PPA structures |

Domain enrichments are applied to:
- Expert Bench voice outputs (particularly Voices 8, 9, 10, 11)
- Signal tagging (Domain tag field)
- Macro Regime Compatibility Score (geopolitical stability factor)
- Underwriting Memo §8.11 (Prologis Overlay)

### 10.2 vs Prologis Tab Mechanics

When the vs Prologis tab is active, the thesis view is augmented with:
- **Prologis Position Card:** Current Prologis corporate posture on the same thesis domain (drawn from CLAUDE.md-maintained intelligence layer)
- **Divergence Indicator:** Where Will's thesis directionally diverges from Prologis corporate development posture — flagged prominently
- **Information Advantage Check:** Does Will's personal thesis benefit from information that may be material and non-public in the Prologis context? If detected, a disclosure reminder is surfaced (non-blocking; judgment is Will's)
- **Preemption Risk Indicator:** Probability that Prologis may formally pursue the same thesis at the corporate level (displacing personal positioning opportunity)

### 10.3 Separation Guarantee

Regardless of active tab, the vault maintains strict separation:
- Personal portfolio records are never co-mingled with Prologis corporate development records
- Intelligence sharing flows one direction for analysis only: Prologis domain context informs personal thesis analysis
- No personal portfolio data is written into Prologis corporate development records
- `CLAUDE.md` governs the vault separation rules; this spec governs the UI expression of that separation

---

## Appendix A — Spec Governance

| Field | Value |
|-------|-------|
| **Author** | Will Jarvis |
| **First Published** | [Date of first commit] |
| **Governed By** | This document (`thesis-engine-spec.md`) |
| **References** | `CLAUDE.md` (vault governance) |
| **Referenced By** | Dossier UI product code; agent prompt architecture |
| **Amendment Process** | All material changes committed via Git with version increment; prior versions preserved |
| **Conflict Resolution** | On matters of vault behavior, `CLAUDE.md` governs. On matters of UI behavior and analytical mechanics, this spec governs. On ambiguous matters, this spec defers to `CLAUDE.md`. |

## Appendix B — Glossary

| Term | Definition |
|------|-----------|
| **Conviction Score** | Numeric 0–100 score representing confidence in a thesis at a point in time |
| **Primary Variable** | The single most important variable whose directional movement is necessary for thesis success |
| **Composite Signal Ratio** | Ratio of confirming signal weight to total signal weight (confirming + contradicting) |
| **Decay Clock** | Time-based conviction erosion mechanism; active in Watch and Live stages |
| **Evidence Drift** | 30-day rolling change in Net Conviction Signal; indicates directional trend in evidence |
| **Expert Bench** | The locked 18-voice analytical framework applied at PressureTest and Forced Reassessment |
| **Kill Pathway** | One of four defined routes by which a thesis enters the Kill Protocol |
| **Kill Type** | One of five classifications of why a thesis was killed; shapes learning extraction |
| **Macro Regime Bar** | Persistent UI element displaying current regime and thesis compatibility |
| **Net Conviction Signal** | Confirming Score minus Contradicting Score; directional evidence balance |
| **Trigger Proximity Tracker** | Multi-dimensional monitor of distance to kill thresholds |
| **Underwriting Memo** | 15-section formal thesis document locked at Actionable stage |
| **Variant Perception** | The specific, evidence-backed disagreement with consensus that justifies the thesis |
