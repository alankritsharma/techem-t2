/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GROUND TRUTH: Techem Property Sample CSV Reference Schema
 * 
 * This schema defines the expected structure and business logic based on 
 * the provided sample files (property_1.csv to property_20.csv).
 */

export const PROPERTY_CSV_SCHEMA = {
  expectedColumns: [
    'date',
    'zipcode',
    'energysource',
    'city',
    'energyusage [kWh]',
    'livingspace [m²]',
    'mean outside temperature [°C]',
    'roomnumber',
    'emission factor [g/kWh]',
    'unitnumber'
  ],
  
  dataTypes: {
    date: 'ISO_DATE (YYYY-MM-DD)',
    zipcode: 'integer',
    energysource: 'string',
    city: 'string',
    energyUsage: 'float',
    livingSpace: 'float',
    temperature: 'float',
    roomNumber: 'integer',
    emissionFactor: 'float',
    unitNumber: 'integer'
  },

  businessRules: {
    minLivingSpace: 5.0, // m²
    maxLivingSpace: 10000.0,
    minRoomNumber: 1,
    maxRoomNumber: 99,
    minTemperature: -50,
    maxTemperature: 60,
    minEmissionFactor: 0,
    maxEmissionFactor: 1000,
    allowedEnergySources: ['Erdgas', 'Fernwärme', 'Heizöl'],
    frequency: 'daily'
  },

  knownCities: [
    'Halle', 'Reutlingen', 'Duisburg', 'Frankfurt', 'Köln', 
    'München', 'Osnabrück', 'Bremen', 'Würzburg', 'Offenbach a. Main', 
    'Rüsselsheim', 'Königstein im Taunus'
  ]
};

export function validateDatasetAgainstSchemaReference() {
  // Logic to be used in historyValidation.ts for deep schema locking
  return true;
}
