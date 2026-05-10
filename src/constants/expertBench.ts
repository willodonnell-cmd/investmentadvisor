import type { ExpertVoiceId } from '../types'

export interface ExpertBenchEntry {
  name: string
  cluster: string
  module: string
  characteristicReasoning: string
}

/** Bench chosen for multi-decade or crisis-era fund records and allocator influence, each with a distinct cognitive module. */
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
  Lynch: {
    name: 'Peter Lynch',
    cluster: 'GrowthAndQualityAtPrice',
    module: 'Know what you own, GARP, ten-baggers from fundamentals you can verify on the ground',
    characteristicReasoning: 'Is this a stock I can explain in two minutes, and does growth justify what I am paying?',
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
  Simons: {
    name: 'Jim Simons',
    cluster: 'FactorAndQuantitative',
    module: 'Systematic signals, statistical edge, process over story, non-narrative risk decomposition',
    characteristicReasoning: 'What repeatable pattern or inefficiency does the data support, independent of the anecdote?',
  },
  Klarman: {
    name: 'Seth Klarman',
    cluster: 'DeepValueAndContrarian',
    module: 'Margin of safety, downside obsession, special situations, market psychology',
    characteristicReasoning: 'How much can I lose, and is the margin of safety sufficient even in a bad outcome?',
  },
  Marks: {
    name: 'Howard Marks',
    cluster: 'RiskAndCycle',
    module: 'Market cycles, second-level thinking, risk calibration, where we are in the cycle',
    characteristicReasoning: 'What is the consensus thinking, and what does it imply about where the real opportunity lies?',
  },
  Dalio: {
    name: 'Ray Dalio',
    cluster: 'SystemsAndMacro',
    module: 'Economic machine, diversified bets, risk parity, policy and credit linkages',
    characteristicReasoning: 'How do rates, growth, and inflation interact here, and is the portfolio robust to the wrong branch?',
  },
  Tepper: {
    name: 'David Tepper',
    cluster: 'DistressedAndCatalyst',
    module: 'Crisis capital, distressed debt and equity, policy-sensitive inflection trades',
    characteristicReasoning: 'Where is the asymmetry when fear or policy has mispriced the recovery path?',
  },
  Robertson: {
    name: 'Julian Robertson',
    cluster: 'LongShortEquity',
    module: 'Pair trades, fundamental long/short, disciplined sell discipline, talent for picking expression',
    characteristicReasoning: 'What is the best long expression and the cleanest hedge or short against the same theme?',
  },
  TudorJones: {
    name: 'Paul Tudor Jones',
    cluster: 'MacroAndRiskControl',
    module: 'Risk control first, macro timing, tape-reading discipline, preservation in tail events',
    characteristicReasoning: 'What is my worst-case path, and have I defined the exit before the emotion arrives?',
  },
  Icahn: {
    name: 'Carl Icahn',
    cluster: 'ActivistAndAdversarial',
    module: 'Balance sheet pressure, governance fights, catalyst forcing, hard-nosed sum-of-parts',
    characteristicReasoning: 'Where is management or the board blocking value that an owner could unlock?',
  },
  Zell: {
    name: 'Sam Zell',
    cluster: 'RealAssetsAndCycle',
    module: 'Real assets, supply-demand fundamentals, distressed situations, capital cycle investing',
    characteristicReasoning: 'What does the supply-demand setup look like at the asset level, ignoring the macro noise?',
  },
  Templeton: {
    name: 'John Templeton',
    cluster: 'GlobalContrarian',
    module: 'Maximum pessimism buying, global relative value, patience across cycles',
    characteristicReasoning: 'Where is the world most wrong and most depressed, and is the discount already the margin of safety?',
  },
  Schloss: {
    name: 'Walter Schloss',
    cluster: 'DeepValueAndForensic',
    module: 'Asset-heavy deep value, balance sheet first, low turnover, Grahamite discipline',
    characteristicReasoning: 'What are tangibles worth in liquidation or replacement, and am I paying far below that?',
  },
  Greenblatt: {
    name: 'Joel Greenblatt',
    cluster: 'SpecialSituationsAndValuation',
    module: 'Special situations, spin-offs, simple valuation rules applied consistently, narrative to cheapness',
    characteristicReasoning: 'Is there a corporate action or clean valuation spread that makes the payoff map simple?',
  },
  Ackman: {
    name: 'Bill Ackman',
    cluster: 'ActivistAndCatalyst',
    module: 'Concentrated activism, catalyst identification, business quality plus forcing events',
    characteristicReasoning: 'What is the specific intervention or catalyst that closes the gap between intrinsic and market value?',
  },
} as const
