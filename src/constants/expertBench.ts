import type { ExpertVoiceId } from '../types'

export interface ExpertBenchEntry {
  name: string
  cluster: string
  module: string
  characteristicReasoning: string
}

export const EXPERT_BENCH: Record<ExpertVoiceId, ExpertBenchEntry> = {
  Buffett: {
    name: 'Warren Buffett',
    cluster: 'QualityAndDuration',
    module: 'Business quality, durable moats, owner-operator capital allocation, decade-plus duration',
    characteristicReasoning: 'Would I still want to own this business in ten years if the market closed tomorrow?',
  },
  Munger: {
    name: 'Charlie Munger',
    cluster: 'SkepticismAndInversion',
    module: 'Mental models, inversion, incentive analysis, intellectual immune system',
    characteristicReasoning: 'Invert, always invert. What would have to be true for this to fail catastrophically?',
  },
  Fisher: {
    name: 'Philip Fisher',
    cluster: 'GrowthAndManagement',
    module: 'Scuttlebutt research, management quality, long-term growth runway, R&D compounders',
    characteristicReasoning: 'What do competitors, suppliers, and customers say about this company that the market doesn\'t know?',
  },
  Smith: {
    name: 'Terry Smith',
    cluster: 'QualityAndDuration',
    module: 'High-return businesses, reinvestment quality, valuation discipline, ROCE focus',
    characteristicReasoning: 'Find it. Buy it. Hold it. Is this business truly exceptional at what it does?',
  },
  Soros: {
    name: 'George Soros',
    cluster: 'MacroAndReflexivity',
    module: 'Reflexivity, macro regime shifts, feedback loops, participant bias in markets',
    characteristicReasoning: 'What is the prevailing bias in the market, and how is it distorting reality? When does the loop break?',
  },
  Druckenmiller: {
    name: 'Stan Druckenmiller',
    cluster: 'MacroAndReflexivity',
    module: 'Liquidity flows, macro inflection, concentrated bets at high conviction, asymmetric setups',
    characteristicReasoning: 'Where is liquidity going next, and am I sizing appropriately for a high-conviction macro turn?',
  },
  Marks: {
    name: 'Howard Marks',
    cluster: 'RiskAndCycle',
    module: 'Market cycles, second-level thinking, risk calibration, where we are in the cycle',
    characteristicReasoning: 'What is the consensus thinking, and what does it imply about where the real opportunity lies?',
  },
  Burry: {
    name: 'Michael Burry',
    cluster: 'DeepValueAndContrarian',
    module: 'Deep value, balance sheet forensics, contrarian positioning, structural mispricing',
    characteristicReasoning: 'What does everyone assume that isn\'t true? Where is the number that\'s wrong?',
  },
  Klarman: {
    name: 'Seth Klarman',
    cluster: 'DeepValueAndContrarian',
    module: 'Margin of safety, downside obsession, special situations, market psychology',
    characteristicReasoning: 'How much can I lose, and is the margin of safety sufficient even in a bad outcome?',
  },
  Greenblatt: {
    name: 'Joel Greenblatt',
    cluster: 'SpecialSituationsAndFormulas',
    module: 'Special situations, spin-offs, capital allocation, simple frameworks applied rigorously',
    characteristicReasoning: 'Is there a corporate action or structure that is causing this to be mispriced in a predictable way?',
  },
  Miller: {
    name: 'Bill Miller',
    cluster: 'GrowthAndManagement',
    module: 'Growth at reasonable price, tech disruption, Kelly sizing, probabilistic thinking',
    characteristicReasoning: 'What is the expected value here, and am I thinking about probability correctly versus the market?',
  },
  Wood: {
    name: 'Cathie Wood',
    cluster: 'TechDisruption',
    module: 'Disruptive technology S-curves, convergence effects, long-duration exponential growth',
    characteristicReasoning: 'What is the 5-year disruption scenario, and is the market pricing in far too little of the convergence opportunity?',
  },
  Ackman: {
    name: 'Bill Ackman',
    cluster: 'ActivistAndCatalyst',
    module: 'Activist value creation, catalyst identification, business quality + catalyst combinations',
    characteristicReasoning: 'What is the specific intervention or catalyst that closes the gap between intrinsic and market value?',
  },
  Zell: {
    name: 'Sam Zell',
    cluster: 'RealAssetsAndCycle',
    module: 'Real assets, supply-demand fundamentals, distressed situations, capital cycle investing',
    characteristicReasoning: 'What does the supply-demand setup look like at the asset level, ignoring the macro noise?',
  },
  Chancellor: {
    name: 'Edward Chancellor',
    cluster: 'HistoricalAndCycle',
    module: 'Financial history, speculative manias, capital cycle theory, long-term mean reversion',
    characteristicReasoning: 'What does history say about situations like this? Have we seen this before, and how did it end?',
  },
  Asness: {
    name: 'Cliff Asness',
    cluster: 'FactorAndQuantitative',
    module: 'Factor investing, momentum, value, quality premia, behavioral finance, portfolio construction',
    characteristicReasoning: 'What does the systematic evidence say about this factor exposure? Is the premium still there and why?',
  },
  Kahneman: {
    name: 'Daniel Kahneman',
    cluster: 'BehavioralAndPsychological',
    module: 'Cognitive biases, overconfidence, narrative fallacy, base rates, System 1 vs System 2',
    characteristicReasoning: 'What biases might be contaminating this thesis? What does the base rate say versus the narrative?',
  },
  Damodaran: {
    name: 'Aswath Damodaran',
    cluster: 'ValuationRigor',
    module: 'DCF discipline, narrative-to-numbers, terminal value, valuation frameworks for all asset types',
    characteristicReasoning: 'What story is embedded in this valuation, and does the number I\'m paying make sense given the narrative?',
  },
} as const
