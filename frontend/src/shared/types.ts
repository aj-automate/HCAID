export type Value = string | number

export interface FeatureOption {
  value: Value
  label: string
}

export interface FeatureMeta {
  name: string
  question: string
  short: string
  why?: string | null
  options?: FeatureOption[]
  unit?: string
  min?: number
  max?: number
  step?: number
}

export interface Band {
  band: 'laag' | 'gemiddeld' | 'hoog'
  van: number
  tot: number
  aandeel: number
  werkelijk_bad: number
}

export interface FairnessRow {
  n: number
  werkelijk_bad: number
  gemiddelde_kans: number
  geflagd: number
  fpr: number
  fnr: number
}

export interface Meta {
  features: FeatureMeta[]
  defaults: Record<string, Value>
  not_used: { name: string; short: string }[]
  model: {
    type: string
    hidden_layers: number[]
    dataset: string
    test_auc: number
    test_accuracy: number
    recall_bad: number
    base_rate: number
    bands: Band[]
    importance: { feature: string; label: string; mean: number; std: number }[]
    fairness: Record<string, Record<string, FairnessRow>>
    n_test: number
  }
}

export interface Contribution {
  feature: string
  label: string
  value: Value
  value_label: string
  contribution: number
}

export interface Counterfactual {
  credit_amount: number
  duration: number
  probability: number
  band: Band['band']
  verschil: number
}

export interface Lever {
  feature: string
  label: string
  from: string
  to: string
  probability: number
  band: Band['band']
  verschil: number
}

export interface Prediction {
  probability: number
  band: Band
  confidence: { label: 'zeker' | 'redelijk zeker' | 'twijfelgeval'; afstand_tot_grens: number }
  base_rate: number
  explanation: Contribution[]
  counterfactuals: Counterfactual[]
  levers: Lever[]
}

export interface Offer {
  approved: boolean
  requested: number
  upsell_amount: number
  apr: number
  months: number
  monthly: number
  total: number
  closing_fee: number
  late_fee: number
  behind_the_scenes: {
    probability: number
    segment: string
    breakdown: { label: string; pp: number }[]
    expected_extra_interest: number
  }
}

export type Urgency = 'vandaag' | 'deze_week' | 'geen_haast'
