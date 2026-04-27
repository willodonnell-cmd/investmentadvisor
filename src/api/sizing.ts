import type { Thesis, VariantPerceptionStrength } from '../types'
import type { Scenario } from '../types'
import type { SizingOutput, SizingRung } from '../types'
import type { MacroRegime } from '../types'

interface ScenarioTriplet {
  confirmed: Scenario | undefined
  contested: Scenario | undefined
  broken: Scenario | undefined
}

function quarterKellyAnchor(scenarios: ScenarioTriplet): number {
  const { confirmed, contested, broken } = scenarios
  if (!confirmed || !contested || !broken) return 0.03

  const pBull = confirmed.probability
  const rBull = (confirmed.returnRangeMin + confirmed.returnRangeMax) / 2 / 100
  const pBase = contested.probability
  const rBase = (contested.returnRangeMin + contested.returnRangeMax) / 2 / 100
  const pBear = broken.probability
  const rBear = (broken.returnRangeMin + broken.returnRangeMax) / 2 / 100

  const expectedValue = pBull * rBull + pBase * rBase + pBear * rBear
  const denominator = pBear * Math.abs(rBear)

  if (denominator === 0 || expectedValue <= 0) return 0.01
  const kelly = expectedValue / denominator
  return Math.min(kelly * 0.25, 0.20)
}

const VARIANT_MULT: Record<VariantPerceptionStrength, number> = {
  ClearConsensusStrongVariant: 1.20,
  MixedConsensusModerateVariant: 1.05,
  UnclearConsensusWeakVariant: 0.90,
  BroadlyAgreesWithConsensus: 0.75,
}

function underwritingQualityModifier(thesis: Thesis): number {
  const hasScores = thesis.businessQualityScore !== undefined && thesis.stockAttractivenessScore !== undefined
  if (!hasScores) return 0.85
  const q = (thesis.businessQualityScore! + thesis.stockAttractivenessScore!) / 2
  return 0.70 + (q / 10) * 0.60
}

function variantPerceptionModifier(thesis: Thesis): number {
  return VARIANT_MULT[thesis.variantPerceptionStrength]
}

function triggerReadinessModifier(thesis: Thesis): number {
  const score = thesis.triggerReadinessScore ?? 50
  return 0.70 + (score / 100) * 0.60
}

function quadrantModifier(thesis: Thesis): number {
  const q = thesis.quadrant
  if (q === 'FullConviction') return 1.20
  if (q === 'HoldOrWatch') return 0.85
  if (q === 'TacticalPosition') return 0.75
  if (q === 'Avoid') return 0.30
  return 1.00
}

function convictionDecayModifier(thesis: Thesis): number {
  const { zone } = thesis.decayClock
  if (zone === 'Green') return 1.00
  if (zone === 'Yellow') return 0.90
  if (zone === 'Orange') return 0.75
  if (zone === 'Red') return 0.55
  return 0.35
}

function macroRegimeModifier(thesis: Thesis): number {
  const compat = thesis.macroRegimeCompatibility
  if (compat === 'StrongTailwind') return 1.15
  if (compat === 'Tailwind') return 1.05
  if (compat === 'Mixed') return 1.00
  if (compat === 'Headwind') return 0.88
  if (compat === 'StrongHeadwind') return 0.75
  return 1.00
}

function portfolioConstraints(
  thesis: Thesis,
  allTheses: Thesis[],
  isPrologisAware: boolean,
): SizingOutput['portfolioConstraints'] {
  const overlapCount = allTheses.filter(
    (t) =>
      t.id !== thesis.id &&
      (t.primaryMispricedVariable === thesis.primaryMispricedVariable ||
        t.secondaryMispricedVariables.includes(thesis.primaryMispricedVariable)),
  ).length

  const overlapPenalty = overlapCount >= 3 ? 0.85 : overlapCount >= 2 ? 0.92 : 1.0

  const liveTheses = allTheses.filter(
    (t) => t.stage === 'Live' || t.stage === 'Actionable',
  ).length
  const concentrationAdjustment = liveTheses > 10 ? 0.90 : liveTheses > 7 ? 0.95 : 1.0

  const capitalSourceAdjustment = thesis.lens === 'CompareVsPrologis' ? 0.80 : 1.0

  const macroDriverConcentration =
    isPrologisAware &&
    (thesis.primaryMispricedVariable === 'GrowthRate' ||
      thesis.type === 'RealEstatePhysicalAssets')
      ? 0.85
      : 1.0

  return {
    overlapPenalty,
    concentrationAdjustment,
    capitalSourceAdjustment,
    macroDriverConcentration,
  }
}

function constrainedSize(
  anchorSize: number,
  combinedModifier: number,
  constraints: SizingOutput['portfolioConstraints'],
): number {
  const modifiedSize =
    anchorSize *
    combinedModifier *
    constraints.overlapPenalty *
    constraints.concentrationAdjustment *
    constraints.capitalSourceAdjustment *
    constraints.macroDriverConcentration
  return Math.max(0.005, Math.min(0.20, modifiedSize))
}

function deriveRung(targetPct: number, anchorSize: number): SizingRung {
  const ratio = targetPct / anchorSize
  if (targetPct < 0.005) return 'Exit'
  if (targetPct < 0.01) return 'WatchOnly'
  if (ratio < 0.35) return 'StarterPosition'
  if (ratio < 0.65) return 'HalfPosition'
  if (ratio < 0.85) return 'TrimmedCore'
  if (ratio < 1.15) return 'FullPosition'
  return 'OverweightConviction'
}

export function computeSizing(
  thesis: Thesis,
  scenarios: Scenario[],
  allTheses: Thesis[],
  isPrologisAware: boolean,
  regime: MacroRegime | null,
): SizingOutput {
  const scenarioCast: ScenarioTriplet = {
    confirmed: scenarios.find((s) => s.type === 'ThesisConfirmed'),
    contested: scenarios.find((s) => s.type === 'ContestedPath'),
    broken: scenarios.find((s) => s.type === 'ThesisBroken'),
  }

  const anchorSize = quarterKellyAnchor(scenarioCast)

  const mods = {
    underwritingQuality: underwritingQualityModifier(thesis),
    variantPerception: variantPerceptionModifier(thesis),
    triggerReadiness: triggerReadinessModifier(thesis),
    quadrant: quadrantModifier(thesis),
    convictionDecay: convictionDecayModifier(thesis),
    macroRegime: regime ? macroRegimeModifier(thesis) : 1.0,
  }

  const rawProduct =
    mods.underwritingQuality *
    mods.variantPerception *
    mods.triggerReadiness *
    mods.quadrant *
    mods.convictionDecay *
    mods.macroRegime

  const boundedModifier = Math.max(0.30, Math.min(1.40, rawProduct))
  const combinedModifier = boundedModifier

  const constraints = portfolioConstraints(thesis, allTheses, isPrologisAware)
  const targetSizePct = constrainedSize(anchorSize, combinedModifier, constraints)
  const startingSizePct = targetSizePct * 0.5
  const sizingBand: [number, number] = [
    Math.max(0.005, targetSizePct * 0.70),
    Math.min(0.20, targetSizePct * 1.30),
  ]

  const rung = deriveRung(targetSizePct, anchorSize)

  const whatWouldIncreaseSize: string[] = []
  const whatWouldDecreaseSize: string[] = []
  const whatWouldTriggerExit: string[] = []

  if (mods.triggerReadiness < 1.0) whatWouldIncreaseSize.push('Trigger readiness improvement to Active state')
  if (mods.variantPerception < 1.0) whatWouldIncreaseSize.push('Stronger consensus divergence confirming variant view')
  if (mods.macroRegime < 1.0) whatWouldIncreaseSize.push('Macro regime rotation to tailwind configuration')
  if (mods.underwritingQuality < 1.0) whatWouldIncreaseSize.push('Higher business quality or stock attractiveness score')

  if (thesis.decayClock.zone !== 'Green') whatWouldDecreaseSize.push('Continued decay without affirming evidence')
  if (constraints.overlapPenalty < 1.0) whatWouldDecreaseSize.push('Additional overlapping thesis entries')

  whatWouldTriggerExit.push(`Primary disconfirmer: ${thesis.disconfirmers[0] ?? 'core assumption failure'}`)
  if (thesis.decayClock.zone === 'Red' || thesis.decayClock.zone === 'Overdue') {
    whatWouldTriggerExit.push('Decay clock in overdue zone with no evidence support')
  }

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const rationale =
    `Quarter-Kelly anchor ${pct(anchorSize)} × combined modifier ${boundedModifier.toFixed(2)} ` +
    `(underwriting ${mods.underwritingQuality.toFixed(2)}, variant ${mods.variantPerception.toFixed(2)}, ` +
    `trigger ${mods.triggerReadiness.toFixed(2)}, quadrant ${mods.quadrant.toFixed(2)}, ` +
    `decay ${mods.convictionDecay.toFixed(2)}, macro ${mods.macroRegime.toFixed(2)}) ` +
    `→ target ${pct(targetSizePct)} [band ${pct(sizingBand[0])}–${pct(sizingBand[1])}]`

  return {
    sizingBand,
    targetSizePct,
    startingSizePct,
    rung,
    anchorSize,
    combinedModifier,
    boundedModifier,
    modifierBreakdown: mods,
    portfolioConstraints: constraints,
    rationale,
    whatWouldIncreaseSize,
    whatWouldDecreaseSize,
    whatWouldTriggerExit,
  }
}
