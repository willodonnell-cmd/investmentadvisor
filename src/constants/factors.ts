import type { FactorType } from '../types'

export interface FactorDefinition {
  label: string
  description: string
  positiveExposureExample: string
  negativeExposureExample: string
}

export const FACTORS: Record<FactorType, FactorDefinition> = {
  MarketBeta: {
    label: 'Market Beta',
    description: 'Sensitivity to broad equity market moves',
    positiveExposureExample: 'High-beta cyclicals, leveraged plays',
    negativeExposureExample: 'Short positions, defensive assets',
  },
  Value: {
    label: 'Value',
    description: 'Exposure to cheap-versus-expensive valuation spread',
    positiveExposureExample: 'Low P/E, high FCF yield businesses',
    negativeExposureExample: 'High-multiple growth stocks',
  },
  Quality: {
    label: 'Quality',
    description: 'Exposure to high-ROIC, strong balance sheet factor',
    positiveExposureExample: 'Compounders with durable competitive advantage',
    negativeExposureExample: 'Low-quality, leveraged balance sheets',
  },
  Momentum: {
    label: 'Momentum',
    description: 'Exposure to recent price and earnings trend continuation',
    positiveExposureExample: 'Stocks with accelerating earnings revisions',
    negativeExposureExample: 'Mean-reversion contrarian positions',
  },
  Size: {
    label: 'Size',
    description: 'Small-cap vs. large-cap factor exposure',
    positiveExposureExample: 'Micro-cap and small-cap positions',
    negativeExposureExample: 'Large-cap mega-tech positions',
  },
  Duration: {
    label: 'Duration',
    description: 'Sensitivity to long-term interest rate changes',
    positiveExposureExample: 'Long-duration growth stocks, REITs',
    negativeExposureExample: 'Short-duration value / commodity plays',
  },
  Commodity: {
    label: 'Commodity',
    description: 'Exposure to physical commodity price cycles',
    positiveExposureExample: 'Energy producers, miners, agri-commodities',
    negativeExposureExample: 'Commodity-consuming businesses without pricing power',
  },
  Credit: {
    label: 'Credit',
    description: 'Exposure to credit spread widening or tightening',
    positiveExposureExample: 'High-yield corporate bond proxies, leveraged companies',
    negativeExposureExample: 'Defensive investment-grade proxies',
  },
}
