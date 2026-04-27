import type { MacroDriver } from '../types'

export interface MacroDriverDefinition {
  label: string
  description: string
  supportedThesisTypes: string[]
}

export const MACRO_DRIVERS: Record<MacroDriver, MacroDriverDefinition> = {
  AiCapexCycle: {
    label: 'AI Capex Cycle',
    description: 'Investment wave in AI infrastructure, data centers, and enabling hardware',
    supportedThesisTypes: ['TechnologyDisruption', 'CapitalCycle', 'LongDurationCompounder'],
  },
  UsInterestRates: {
    label: 'US Interest Rates',
    description: 'Direction and level of US short and long-term rates, Fed policy path',
    supportedThesisTypes: ['MacroRegimeShift', 'RealEstatePhysicalAssets', 'HouseholdAllocationDecision'],
  },
  CreditCycle: {
    label: 'Credit Cycle',
    description: 'Availability and pricing of credit, default cycle positioning',
    supportedThesisTypes: ['MacroRegimeShift', 'CapitalCycle', 'OperationalTurnaround'],
  },
  DollarDirection: {
    label: 'Dollar Direction',
    description: 'USD strength or weakness against major trade partners',
    supportedThesisTypes: ['MacroRegimeShift', 'Geopolitical'],
  },
  EnergyPriceLevel: {
    label: 'Energy Price Level',
    description: 'Oil, gas, and power price levels and their impact on costs and profits',
    supportedThesisTypes: ['MacroRegimeShift', 'CapitalCycle', 'ClimateEnergyTransition'],
  },
  ChinaEconomicTrajectory: {
    label: 'China Economic Trajectory',
    description: 'China growth, stimulus, and structural demand patterns',
    supportedThesisTypes: ['MacroRegimeShift', 'Geopolitical', 'IndustryStructureConsumerBehavior'],
  },
  DeglobalizationReshoring: {
    label: 'Deglobalization / Reshoring',
    description: 'Supply chain restructuring, tariffs, and industrial policy',
    supportedThesisTypes: ['RegulatoryPolicy', 'IndustryStructureConsumerBehavior', 'Geopolitical'],
  },
  RegulatoryEnvironment: {
    label: 'Regulatory Environment',
    description: 'Antitrust, sector-specific regulation, and government intervention',
    supportedThesisTypes: ['RegulatoryPolicy', 'TechnologyDisruption', 'MarketStructureReflexivity'],
  },
  GeopoliticalRiskPremium: {
    label: 'Geopolitical Risk Premium',
    description: 'War, sanctions, trade conflict, and global instability',
    supportedThesisTypes: ['Geopolitical', 'MacroRegimeShift', 'ShortHedgeThesis'],
  },
  ConsumerHealth: {
    label: 'Consumer Health',
    description: 'US consumer balance sheet, spending power, and sentiment',
    supportedThesisTypes: ['IndustryStructureConsumerBehavior', 'MacroRegimeShift', 'CapitalCycle'],
  },
  LaborMarketWageDynamics: {
    label: 'Labor Market / Wage Dynamics',
    description: 'Employment levels, wage inflation, and labor cost pressures',
    supportedThesisTypes: ['MacroRegimeShift', 'IndustryStructureConsumerBehavior', 'OperationalTurnaround'],
  },
  RealAssetRepricing: {
    label: 'Real Asset Repricing',
    description: 'Valuation reset for physical assets: real estate, infrastructure, commodities',
    supportedThesisTypes: ['RealEstatePhysicalAssets', 'MacroRegimeShift', 'DeepContrarianMispricing'],
  },
  TechnologyAdoptionCurve: {
    label: 'Technology Adoption Curve',
    description: 'Pace of technology diffusion and S-curve positioning',
    supportedThesisTypes: ['TechnologyDisruption', 'LongDurationCompounder', 'MarketStructureReflexivity'],
  },
  PoliticalEconomyFiscal: {
    label: 'Political Economy / Fiscal',
    description: 'Government spending, deficits, and political economy shifts',
    supportedThesisTypes: ['MacroRegimeShift', 'RegulatoryPolicy', 'Geopolitical'],
  },
  ClimateEnergyTransition: {
    label: 'Climate / Energy Transition',
    description: 'Clean energy adoption, carbon pricing, and physical climate risk',
    supportedThesisTypes: ['RealEstatePhysicalAssets', 'CapitalCycle', 'TechnologyDisruption'],
  },
}
