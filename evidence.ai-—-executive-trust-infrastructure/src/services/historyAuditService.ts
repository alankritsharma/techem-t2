/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';
import { CsvAuditReport, CsvAuditFinding, TrustDecision } from '../types';

const REQUIRED_HEADERS = [
  'propertyid',
  'date',
  'zipcode',
  'city',
  'energysource',
  'energyusage [kwh]',
  'livingspace [m2]',
  'mean outside temperature [c]',
  'roomnumber',
  'emissionfactorg/kwh',
  'unitnumber'
];

export async function runCsvAuditCheck(fileName: string, content: string): Promise<CsvAuditReport> {
  const findings: CsvAuditFinding[] = [];
  let propertyId = 'UNKNOWN';
  
  // 1. CSV Structure Audit
  const structureFindings = auditCsvStructure(fileName, content);
  findings.push(...structureFindings);

  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  });

  const headers = (results.meta.fields || []).map(h => h.toLowerCase().trim());
  
  // 2. Column Structure Audit
  const columnFindings = auditColumnStructure(fileName, headers);
  findings.push(...columnFindings);

  const data = results.data as any[];
  if (data.length > 0 && data[0].propertyid) {
    propertyId = String(data[0].propertyid);
  }

  // 3. Data Format, 4. Quality, 5. Business Rules
  if (data.length > 0) {
    findings.push(...auditDataFormat(fileName, propertyId, data));
    findings.push(...auditDataQuality(fileName, propertyId, data));
    findings.push(...auditBusinessRules(fileName, propertyId, data));
  } else {
    findings.push({
      id: `audit-${Date.now()}-empty`,
      fileName,
      propertyId,
      category: 'DATA_QUALITY',
      title: 'Empty File',
      rootCause: 'The CSV file contains no data rows.',
      affectedRows: [],
      affectedColumns: [],
      technicalCause: 'Parser reached EOF without finding records.',
      businessCause: 'Operational history file is empty.',
      recommendedFix: 'Ensure the file is exported correctly from the source system.',
      priority: 'KRITISCH',
      preventiveMeasure: 'Verify export filter settings in the source database.'
    });
  }

  let status: TrustDecision = 'TRUST';
  if (findings.some(f => f.priority === 'KRITISCH')) status = 'HIGH RISK';
  else if (findings.some(f => f.priority === 'HOCH' || f.priority === 'MITTEL')) status = 'REVIEW';

  return {
    fileName,
    propertyId,
    generatedAt: new Date().toISOString(),
    overallStatus: status,
    summary: buildSummaryText(findings),
    findings
  };
}

function auditCsvStructure(fileName: string, content: string): CsvAuditFinding[] {
  const findings: CsvAuditFinding[] = [];
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  if (lines.length > 0) {
    const firstLine = lines[0];
    const delimiters = [',', ';', '\t'];
    const counts = delimiters.map(d => ({ d, count: firstLine.split(d).length }));
    const best = counts.reduce((a, b) => a.count > b.count ? a : b);
    
    if (best.d !== ',' && best.count > 1) {
      findings.push({
        id: `audit-${Date.now()}-delimiter`,
        fileName,
        propertyId: 'PENDING',
        category: 'CSV_STRUCTURE',
        title: 'Non-Standard Delimiter Detected',
        rootCause: `The file uses '${best.d}' instead of the expected comma (',') delimiter.`,
        affectedRows: [0],
        affectedColumns: [],
        technicalCause: 'Inconsistent CSV formatting in the source export.',
        businessCause: 'Standardization mismatch between systems.',
        recommendedFix: "Configure the export to use comma-separated values or use a tool to convert the file's delimiter.",
        priority: 'MITTEL',
        preventiveMeasure: 'Update export profile in the property management system.'
      });
    }
  }

  return findings;
}

function auditColumnStructure(fileName: string, headers: string[]): CsvAuditFinding[] {
  const findings: CsvAuditFinding[] = [];
  const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  
  if (missing.length > 0) {
    findings.push({
      id: `audit-${Date.now()}-missing-cols`,
      fileName,
      propertyId: 'PENDING',
      category: 'COLUMN_STRUCTURE',
      title: 'Missing Required Columns',
      rootCause: `The follow columns are missing: ${missing.join(', ')}.`,
      affectedRows: [0],
      affectedColumns: missing,
      technicalCause: 'Target schema mismatch. The CSV parser cannot map these fields to the database entities.',
      businessCause: 'Essential evidence fields are missing for decision anchoring.',
      recommendedFix: 'Re-export the file ensuring all required property and energy fields are selected.',
      priority: 'KRITISCH',
      preventiveMeasure: 'Use the official CSV template for property evidence imports.'
    });
  }

  const unknown = headers.filter(h => !REQUIRED_HEADERS.includes(h));
  if (unknown.length > 5) {
    findings.push({
      id: `audit-${Date.now()}-extra-cols`,
      fileName,
      propertyId: 'PENDING',
      category: 'COLUMN_STRUCTURE',
      title: 'High Noise Ratio in Schema',
      rootCause: `Found ${unknown.length} unknown columns not utilized by the trust engine.`,
      affectedRows: [0],
      affectedColumns: unknown,
      technicalCause: 'Input contains excessive metadata beyond the system requirements.',
      businessCause: 'Data bloat increases review overhead and storage footprint.',
      recommendedFix: 'Filter the export to include only relevant operational fields.',
      priority: 'NIEDRIG',
      preventiveMeasure: 'Refine PMS export templates.'
    });
  }

  return findings;
}

function auditDataFormat(fileName: string, propertyId: string, data: any[]): CsvAuditFinding[] {
  const findings: CsvAuditFinding[] = [];
  const invalidDates: number[] = [];
  const invalidNumbers: number[] = [];

  data.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (isNaN(Date.parse(row.date))) {
      invalidDates.push(rowNum);
    }
    const envUsage = parseFloat(row['energyusage [kwh]']);
    if (isNaN(envUsage)) {
      invalidNumbers.push(rowNum);
    }
  });

  if (invalidDates.length > 0) {
    findings.push({
      id: `audit-${Date.now()}-date-format`,
      fileName,
      propertyId,
      category: 'DATA_FORMAT',
      title: 'Invalid Temporal Format',
      rootCause: `${invalidDates.length} rows have dates that could not be parsed.`,
      affectedRows: invalidDates.slice(0, 10),
      affectedColumns: ['date'],
      technicalCause: 'Date strings do not match ISO or common regional formats.',
      businessCause: 'Historical records cannot be placed on the timeline for trend analysis.',
      recommendedFix: 'Ensure dates are in YYYY-MM-DD or DD.MM.YYYY format.',
      priority: 'HOCH',
      preventiveMeasure: 'Enforce date formatting in the Excel/CSV export tool.'
    });
  }

  if (invalidNumbers.length > 0) {
    findings.push({
      id: `audit-${Date.now()}-num-format`,
      fileName,
      propertyId,
      category: 'DATA_FORMAT',
      title: 'Structural Type Mismatch',
      rootCause: `${invalidNumbers.length} rows contain non-numeric energy usage data.`,
      affectedRows: invalidNumbers.slice(0, 10),
      affectedColumns: ['energyusage [kwh]'],
      technicalCause: 'Field contains strings, placeholders (e.g., "n/a"), or malformed decimals.',
      businessCause: 'Energy consumption is the primary KPI; non-numeric values block all aggregations.',
      recommendedFix: 'Replace placeholders with numeric 0 or exclude the rows from import.',
      priority: 'KRITISCH',
      preventiveMeasure: 'Implement data type validation at the source before CSV generation.'
    });
  }

  return findings;
}

function auditDataQuality(fileName: string, propertyId: string, data: any[]): CsvAuditFinding[] {
  const findings: CsvAuditFinding[] = [];
  const duplicateKeys: number[] = [];
  const seen = new Set<string>();

  data.forEach((row, idx) => {
    const key = `${row.date}|${row.unitnumber}|${row.propertyid}`;
    if (seen.has(key)) {
      duplicateKeys.push(idx + 1);
    }
    seen.add(key);
  });

  if (duplicateKeys.length > 0) {
    findings.push({
      id: `audit-${Date.now()}-duplicates`,
      fileName,
      propertyId,
      category: 'DATA_QUALITY',
      title: 'Record Uniqueness Conflict',
      rootCause: `Found ${duplicateKeys.length} duplicate entries for the same unit and date.`,
      affectedRows: duplicateKeys.slice(0, 10),
      affectedColumns: ['date', 'unitnumber', 'propertyid'],
      technicalCause: 'Violation of relational integrity; history records must be unique per property-unit-day.',
      businessCause: 'Artificial inflation of energy totals and double-counting of CO2 emissions.',
      recommendedFix: 'De-duplicate the CSV file before importing to the dashboard.',
      priority: 'HOCH',
      preventiveMeasure: 'Ensure the export query uses DISTINCT or proper grouping.'
    });
  }

  const missingTemp = data.filter(r => !r['mean outside temperature [c]'] || r['mean outside temperature [c]'].trim() === '').length;
  if (missingTemp > (data.length * 0.1)) {
     findings.push({
      id: `audit-${Date.now()}-missing-temp`,
      fileName,
      propertyId,
      category: 'DATA_QUALITY',
      title: 'High Sparsity in Weather Correlation',
      rootCause: `${missingTemp} rows are missing outdoor temperature data.`,
      affectedRows: [],
      affectedColumns: ['mean outside temperature [c]'],
      technicalCause: 'Sparse data in secondary evidence field.',
      businessCause: 'Forecast models rely on HDDs (Heating Degree Days) for weather normalization. Missing temps block forecast readiness.',
      recommendedFix: 'Augment the dataset with historical weather data or allow the building engine to fetch it automatically.',
      priority: 'MITTEL',
      preventiveMeasure: 'Integrate a weather station feed into your PMS.'
    });
  }

  return findings;
}

function auditBusinessRules(fileName: string, propertyId: string, data: any[]): CsvAuditFinding[] {
  const findings: CsvAuditFinding[] = [];
  const negativeEnergy = data.filter(r => parseFloat(r['energyusage [kwh]']) < 0).length;
  const zeroLivingSpace = data.filter(r => parseFloat(r['livingspace [m2]']) <= 0).length;

  if (negativeEnergy > 0) {
    findings.push({
      id: `audit-${Date.now()}-neg-energy`,
      fileName,
      propertyId,
      category: 'BUSINESS_RULE',
      title: 'Physical Invariant Violation',
      rootCause: `${negativeEnergy} rows reported negative energy consumption.`,
      affectedRows: [],
      affectedColumns: ['energyusage [kwh]'],
      technicalCause: 'Incorrect signed-number handling or data entry error.',
      businessCause: 'Buildings cannot consume negative energy (unless they are net producers, which requires specialized schema labels).',
      recommendedFix: 'Review the sign of energy values. If these are feed-in values, use the specialized Solar module.',
      priority: 'KRITISCH',
      preventiveMeasure: 'Configure BMS to absolute usage counters.'
    });
  }

  if (zeroLivingSpace > 0) {
    findings.push({
      id: `audit-${Date.now()}-zero-area`,
      fileName,
      propertyId,
      category: 'BUSINESS_RULE',
      title: 'Invalid Normalization Baseline',
      rootCause: `${zeroLivingSpace} rows have zero or negative living space area.`,
      affectedRows: [],
      affectedColumns: ['livingspace [m2]'],
      technicalCause: 'Master data missing for specific units.',
      businessCause: 'Specific consumption (kWh/m²) cannot be calculated (division by zero), breaking efficiency benchmarks.',
      recommendedFix: 'Update unit master data before re-exporting.',
      priority: 'HOCH',
      preventiveMeasure: 'Verify unit area records during property onboarding.'
    });
  }

  return findings;
}

function buildSummaryText(findings: CsvAuditFinding[]): string {
  if (findings.length === 0) return 'No issues detected. High trust evidence.';
  const kritisch = findings.filter(f => f.priority === 'KRITISCH').length;
  const hoch = findings.filter(f => f.priority === 'HOCH').length;
  
  if (kritisch > 0) return `Critical failure: Found ${kritisch} system-blocking issues. Import disabled pending correction.`;
  if (hoch > 0) return `Review required: ${hoch} high-priority issues detected that impact forecast accuracy.`;
  return `Minor issues found: ${findings.length} findings should be reviewed to optimize data quality.`;
}
