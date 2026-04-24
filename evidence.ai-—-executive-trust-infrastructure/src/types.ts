/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Tab = 'dashboard' | 'floorplan' | 'alarms' | 'esg' | 'reports';

export type TrustDecision = 'TRUST' | 'REVIEW' | 'HIGH RISK';
export type ValidationStatus = 'TRUST' | 'REVIEW' | 'HIGH RISK';
export type ObjectSource = 'seed' | 'local' | 'import';
export type StorageMode = 'local' | 'remote';
export type ForecastModelType = 'linear-regression' | 'rule-based' | 'hybrid';
export type ForecastWeatherSource = 'open-meteo' | 'brightsky' | 'mock';
export type DatasetLifecycleStatus = 'VALIDATED' | 'IMPORTED' | 'LINKED' | 'CONVERTED';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AddressValidation {
  original: string;
  validated: string | null;
  validationStatus: ValidationStatus;
  validationNote?: string;
}

export interface SolarPosition {
  elevation: number;
  azimuth: number;
  exposureStatus: 'GOOD' | 'LIMITED' | 'REVIEW';
  calculatedAt: string;
  confidence: number;
}

export interface WeatherProfile {
  source: 'open-meteo' | 'mock' | 'none';
  locationMode: 'coordinates' | 'unvalidated-address' | 'unknown';
  current: {
    temp: number;
    feelsLike: number;
    windSpeed: number;
    humidity: number;
    rainProbability: number;
    condition: string;
    cloudCover: number;
  };
  forecast: Array<{
    time: string;
    temp: number;
    rainProbability: number;
    risk: 'low' | 'medium' | 'high';
  }>;
  fetchedAt: string;
  note?: string;
}

export interface ForecastWeatherDay {
  date: string;
  tempMinC?: number;
  tempMaxC?: number;
  tempMeanC: number;
  precipitationProbability?: number;
  precipitationMm?: number;
  windSpeedKmh?: number;
  humidityPercent?: number;
  cloudCoverPercent?: number;
  source: ForecastWeatherSource;
}

export interface EnergyForecastDay {
  date: string;
  objectId: string;
  predictedEnergyKwh: number;
  predictedCostEur?: number;
  predictedCo2G?: number;
  weatherConfidence: TrustDecision;
  modelConfidence: TrustDecision;
  weakestAssumption: string;
  notes?: string[];
}

export interface ForecastModelMeta {
  id: string;
  objectId: string;
  trainingRecordCount: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  modelType: ForecastModelType;
  featureColumns: string[];
  validationStatus: TrustDecision;
  issues: string[];
  trainedAt: string;
}

export interface HistoricalRecord {
  id: string;
  propertyId: string;
  objectId: string | null;
  date: string;
  zipcode: number;
  city: string;
  energysource: string;
  energyUsageKwh: number;
  livingSpaceM2: number;
  meanOutsideTemperatureC: number;
  roomNumber: number;
  emissionFactorGPerKwh: number;
  unitNumber: number;
  co2EmissionsG: number;
  kwhPerM2: number;
  heatingDegreeDeltaC: number;
  sourceFile: string;
  importedAt: string;
}

export interface CsvValidationIssue {
  code:
    | 'MISSING_COLUMN'
    | 'INVALID_DATE'
    | 'INVALID_NUMBER'
    | 'NEGATIVE_ENERGY'
    | 'MISSING_TEMPERATURE'
    | 'INVALID_LIVING_SPACE'
    | 'INVALID_EMISSION_FACTOR'
    | 'DUPLICATE_ROW'
    | 'TIME_GAP'
    | 'ZERO_USAGE_ANOMALY';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  rowIndex?: number;
  column?: string;
}

export interface CsvValidationSummary {
  fileName: string;
  propertyId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  validationStatus: TrustDecision;
  issues: CsvValidationIssue[];
  missingColumns: string[];
  duplicateCount: number;
  missingTemperatureCount: number;
  invalidLivingSpaceCount: number;
  negativeEnergyCount: number;
  invalidEmissionFactorCount: number;
  zeroUsageAnomalyCount: number;
  timeGapCount: number;
  canImport: boolean;
}

export interface CsvAuditFinding {
  id: string;
  fileName: string;
  propertyId: string;
  category:
    | 'COLUMN_STRUCTURE'
    | 'DATA_FORMAT'
    | 'DATA_QUALITY'
    | 'CSV_STRUCTURE'
    | 'BUSINESS_RULE';
  title: string;
  rootCause: string;
  affectedRows: number[];
  affectedColumns: string[];
  technicalCause: string;
  businessCause: string;
  recommendedFix: string;
  priority: 'KRITISCH' | 'HOCH' | 'MITTEL' | 'NIEDRIG';
  preventiveMeasure: string;
}

export interface CsvAuditReport {
  fileName: string;
  propertyId: string;
  generatedAt: string;
  overallStatus: TrustDecision;
  summary: string;
  findings: CsvAuditFinding[];
}

export interface HistoricalDataset {
  id: string;
  name: string;
  objectId: string | null;
  propertyId: string;
  city: string;
  zipcode: number;
  energySource: string;
  recordCount: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  importedAt: string;
  source: 'upload' | 'sample';
  validationStatus: TrustDecision;
  issues: string[];
  lifecycleStatus?: DatasetLifecycleStatus;
  auditReport?: CsvAuditReport;
}

export interface HistoricalImportPreview {
  fileName: string;
  propertyId: string;
  summary: CsvValidationSummary;
  records: HistoricalRecord[];
  dataset: HistoricalDataset | null;
  auditReport?: CsvAuditReport;
}

export interface HistoryChartPoint {
  date: string;
  energyUsageKwh: number;
  meanOutsideTemperatureC: number;
  co2EmissionsG: number;
  kwhPerM2: number;
  estimatedCostEur?: number;
}

export interface DatasetObjectMapping {
  id: string;
  datasetId: string;
  propertyId: string;
  objectId: string;
  mappingStatus: 'CONFIRMED' | 'REVIEW';
  mappingReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalTrustAssessment {
  objectId: string;
  datasetIds: string[];
  trustStatus: TrustDecision;
  confidenceScore: number;
  weakestPoint: string;
  issues: string[];
  coverage: {
    start: string | null;
    end: string | null;
    recordCount: number;
  };
  calculatedAt: string;
}

export interface ForecastReadinessAssessment {
  objectId: string;
  readinessStatus: 'READY' | 'REVIEW REQUIRED' | 'NOT READY';
  reasons: string[];
  requiredNextStep: string;
  calculatedAt: string;
}

export interface EconomicValueAssessment {
  objectId: string;
  annualCostExposureEur: number;
  annualCo2ExposureKg: number;
  efficiencyGapPercent: number;
  baselineComparison: {
    referenceType: 'historical' | 'portfolio' | 'weather-adjusted';
    referenceValue: number | null;
    currentValue: number | null;
    deltaPercent: number | null;
  };
  riskDrivers: string[];
  weakestEconomicAssumption: string;
  businessConfidence: TrustDecision;
  decisionPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedAction: string;
  explanationSummary: string;
  calculatedAt: string;

  energyPricePerKwh?: number;
  annualUsageKwh?: number;
  effectiveAreaM2?: number;
  benchmarkSource?: string;
  calculationWarnings?: string[];
}

export interface BuildingObject {
  id: string;
  name: string;
  addressOriginal: string;
  addressValidated: string | null;
  locationLabel: string;
  coordinates: Coordinates | null;
  validationStatus: ValidationStatus;
  solarPosition: SolarPosition | null;
  weatherProfile: WeatherProfile | null;
  trustStatus: TrustDecision;
  createdAt: string;
  updatedAt: string;
  source: ObjectSource;
  isLocalDraft: boolean;
  type?: string;
  description?: string;
  historicalDatasetIds?: string[];
  historyStatus?: TrustDecision;
  historyCoverage?: {
    start: string | null;
    end: string | null;
    recordCount: number;
  };
  importMetadata?: {
    propertyId: string;
    datasetId: string;
    derivedFromCsv: boolean;
    sourceFile: string;
  };
}

export interface BuildingProject {
  id: string;
  name: string;
  description: string;
  objectIds: string[];
  createdAt: string;
  updatedAt: string;
  storageMode: StorageMode;
}

export interface LocalStorageEnvelope<T> {
  version: number;
  updatedAt: string;
  data: T;
}

export interface KPIProps {
  label: string;
  value: string;
  unit?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: any;
  status?: 'critical' | 'warning' | 'optimal';
  trustLevel?: number;
}

export interface BuildingInfo {
  id: string;
  name: string;
  type: string;
  location: string;
  size: string;
  built: string;
  usage: string;
  energyScore: number;
  co2Score: number;
  complianceScore: number;
  status: TrustDecision;
  forecastTrustScore: number;
  weakestAssumption: string;
  riskDriver: string;
  recommendedAction: string;
  alerts: { critical: number; warning: number };
  energy: {
    current: string;
    previous: string;
    delta: string;
    cost: string;
    forecast: string;
    deviation: string;
  };
  co2: string;
  complianceRisk: string;
  lastCheck: string;
  description: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  severity: 'critical' | 'warning';
  evidenceSource?: string;
}

export interface ReportCardProps {
  title: string;
  description: string;
  format: 'PDF' | 'CSV';
  lastGenerated: string;
  fileSize: string;
  icon: any;
  colorClass: string;
  isDossier?: boolean;
}

export interface Alarm {
  id: string;
  title: string;
  location: string;
  time: string;
  severity: 'critical' | 'warning';
  assetIcon: any;
  contradictionDetected?: boolean;
}

export interface FloorEvent {
  id: string;
  time: string;
  description: string;
  icon: any;
  status?: 'default' | 'critical' | 'process';
}

export type EvidenceClass =
  | 'PRIMARY_EVIDENCE'
  | 'DERIVED_EVIDENCE'
  | 'ASSUMPTION'
  | 'EXECUTIVE_SUMMARY'
  | 'NON_AUTHORITATIVE_CONTEXT';

export type EvidenceSourceType =
  | 'METER_DATA'
  | 'INVOICE_DATA'
  | 'WEATHER_DATA'
  | 'FINANCIAL_INPUT'
  | 'CSV_IMPORT'
  | 'ASSUMPTION_LAYER'
  | 'DASHBOARD_SUMMARY';

export type ProofLevel =
  | 'FULLY_VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'REQUIRES_REVIEW'
  | 'UNVERIFIED'
  | 'BLOCKED';

export interface EvidenceAuthorityAssessment {
  objectId: string;
  evidenceClass: EvidenceClass;
  sourceTypes: EvidenceSourceType[];
  proofLevel: ProofLevel;
  evidenceCompletenessScore: number;
  authoritativeSources: string[];
  missingEvidence: string[];
  reviewBoundStatements: string[];
  explanationSummary: string;
  calculatedAt: string;

  scoreBreakdown?: Array<{
    label: string;
    delta: number;
    reason: string;
  }>;
}

export interface AdversarialObjection {
  id: string;
  type: 'CFO' | 'GOVERNANCE' | 'REGULATORY' | 'INVESTMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  objection: string;
  whyItMatters: string;
  requiredResolution: string;
}

export interface AdversarialObjectionResult {
  objectId: string;
  weakestObjection: string;
  objectionSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  criticalBlocker: string | null;
  objections: AdversarialObjection[];
  answerabilityStatus: 'ANSWERABLE' | 'PARTIALLY_ANSWERABLE' | 'UNANSWERABLE';
  boardEscalationRequired: boolean;
  calculatedAt: string;
}

export interface RecommendationGateResult {
  objectId: string;
  decision:
    | 'RECOMMENDATION_ALLOWED'
    | 'REVIEW_REQUIRED'
    | 'BLOCKED_DUE_TO_INSUFFICIENT_EVIDENCE'
    | 'EXECUTIVE_ESCALATION_REQUIRED';
  allowed: boolean;
  gateReasons: string[];
  requiredNextStep: string;
  calculatedAt: string;
}

export type OptimizationCategory = 'water' | 'moisture' | 'heating' | 'ev';
export type OptimizationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WaterMeterReading {
  objectId: string;
  timestamp: string;
  coldWaterLiters: number;
  warmWaterLiters: number;
}

export interface MSDReading {
  objectId: string;
  timestamp: string;
  roomLabel?: string;
  temperatureC: number;
  humidityPercent: number;
  windowsOpen?: boolean;
  heatingActive?: boolean;
}

export interface HeatingReading {
  objectId: string;
  timestamp: string;
  roomLabel?: string;
  roomTemperatureC: number;
  heatingActive: boolean;
  energyUsageKwh: number;
  greenEnergySharePercent?: number;
  co2EmissionFactorGPerKwh?: number;
}

export interface EVChargingReading {
  objectId: string;
  timestamp: string;
  chargerId?: string;
  sessionId?: string;
  energyUsageKwh: number;
  isCompleted?: boolean;
}

export interface OptimizationRecommendation {
  objectId: string;
  category: OptimizationCategory;
  severity: OptimizationSeverity;
  confidence: 'TRUST' | 'REVIEW' | 'HIGH RISK';
  issue: string;
  recommendedAction: string;
  economicImpact: string;
  co2Impact?: string;
  createdAt: string;
}

export type SourceMode = 'MEASURED' | 'DERIVED' | 'SIMULATED' | 'FALLBACK';

export interface SensorSnapshot {
  id: string;
  objectId: string;

  waterColdLiters: number;
  waterWarmLiters: number;

  roomTemperature: number;
  humidity: number;

  heatingKwh: number;
  heatingActive: boolean;

  evChargingKwh: number;

  sourceMode: SourceMode;
  createdAt: string;
}

export interface OptimizationSnapshot {
  objectId: string;
  generatedAt: string;
  recommendations: OptimizationRecommendation[];
  topPriority: OptimizationRecommendation | null;
  sensorSource: SourceMode;
}

export interface ReviewDossier {
  objectId: string;
  title: string;
  overallStatus: 'TRUST' | 'REVIEW' | 'HIGH RISK' | 'CRITICAL';
  executiveSummary: string;
  factBase: string[];
  weakestAssumption: string;
  keyRisks: string[];
  economicImpactSummary: string;
  recommendedAction: string;
  nextRequiredEvidence: string[];
  optimizationFindings: OptimizationRecommendation[];
  sensorSource: SourceMode;
  generatedAt: string;
}

export interface ExecutiveDecisionModelResult {
  objectId: string;
  finalStatus: 'TRUST' | 'REVIEW' | 'HIGH RISK' | 'BLOCKED';
  primaryRiskDriver: string;
  weakestAssumption: string;
  criticalFailurePoint: string;
  recommendedNextAction: string;
  confidenceBoundary: string;
  decisionExplanation: string;
  reviewOwner: string;
  optimizationRiskCount: number;
  topOptimizationRisk?: string;
  calculatedAt: string;
}

export interface DerivedEvidenceItem {
  id: string;
  objectId: string;
  title: string;
  description: string;
  sourceType: 'history' | 'dataset' | 'audit' | 'forecast' | 'optimization';
  confidence: 'TRUST' | 'REVIEW' | 'HIGH RISK';
  timestamp: string;
}

export interface DerivedAlarmItem {
  id: string;
  objectId: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning';
  sourceType: 'audit' | 'history' | 'forecast' | 'optimization';
  timestamp: string;
}

export interface DerivedComplianceItem {
  id: string;
  objectId: string;
  pillar: string;
  status: 'Compliant' | 'Warning' | 'Critical';
  lastVerified: string;
  actionLabel: string;
  explanation: string;
}

export interface SevenDayEnergyPoint {
  date: string;
  tempMeanC: number;
  predictedEnergyKwh: number;
  predictedCostEur: number;
  predictedCo2Kg: number;
  trust: 'TRUST' | 'REVIEW' | 'HIGH RISK';
}

export interface HumanReviewDecision {
  id: string;
  objectId: string;
  status: 'AI_ASSESSED' | 'REVIEW_PENDING' | 'HUMAN_VALIDATED' | 'BOARD_READY' | 'BLOCKED';
  reviewOwner: string;
  comment?: string;
  decidedAt: string;
  updatedAt: string;
}
