/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingInfo } from './types';

export const MUSTER_GEBAEUDE: BuildingInfo[] = [
  {
    id: 'hq-frankfurt',
    name: 'HQ Frankfurt',
    type: 'Premium Office Headquarters',
    location: 'Frankfurt am Main',
    size: '18.500 m²',
    built: '2016',
    usage: 'Headquarters / Executive Offices / Operations Center',
    energyScore: 72,
    co2Score: 68,
    complianceScore: 84,
    status: 'REVIEW',
    forecastTrustScore: 61,
    weakestAssumption: 'Stable heating demand between 12:00–18:00',
    riskDriver: 'HVAC instability on Level 4',
    recommendedAction: 'Immediate HVAC maintenance review before 14:00',
    alerts: { critical: 3, warning: 4 },
    energy: {
      current: '118,400 kWh',
      previous: '109,700 kWh',
      delta: '+7.9%',
      cost: '€32,600',
      forecast: '111,000 kWh',
      deviation: '+6.7%'
    },
    co2: '42.8 t',
    complianceRisk: 'Heating efficiency documentation incomplete',
    lastCheck: '2026-04-12',
    description: 'HQ Frankfurt: HVAC instability detected.'
  },
  {
    id: 'logistics-hamburg',
    name: 'Logistics Center Hamburg',
    type: 'Logistics & Distribution Center',
    location: 'Hamburg',
    size: '31.200 m²',
    built: '2012',
    usage: 'Warehouse / Distribution / Cold Storage',
    energyScore: 58,
    co2Score: 54,
    complianceScore: 76,
    status: 'HIGH RISK',
    forecastTrustScore: 43,
    weakestAssumption: 'Cooling load stability during night operations',
    riskDriver: 'Cold storage cooling instability',
    recommendedAction: 'Immediate technical escalation required',
    alerts: { critical: 5, warning: 6 },
    energy: {
      current: '241,800 kWh',
      previous: '219,300 kWh',
      delta: '+10.3%',
      cost: '€61,400',
      forecast: '223,500 kWh',
      deviation: '+8.2%'
    },
    co2: '88.6 t',
    complianceRisk: 'Cold storage energy efficiency threshold exceeded',
    lastCheck: '2026-04-08',
    description: 'Hamburg: Immediate technical escalation required.'
  },
  {
    id: 'office-munich',
    name: 'Office Munich',
    type: 'Regional Office Building',
    location: 'Munich',
    size: '12.800 m²',
    built: '2019',
    usage: 'Administration / Client Services / Sales Office',
    energyScore: 89,
    co2Score: 91,
    complianceScore: 93,
    status: 'TRUST',
    forecastTrustScore: 88,
    weakestAssumption: 'Minor occupancy fluctuation during afternoon peak',
    riskDriver: 'No major operational risk detected',
    recommendedAction: 'No escalation required — continue standard monitoring',
    alerts: { critical: 0, warning: 2 },
    energy: {
      current: '76,200 kWh',
      previous: '74,900 kWh',
      delta: '+1.7%',
      cost: '€19,800',
      forecast: '75,400 kWh',
      deviation: '+1.1%'
    },
    co2: '18.4 t',
    complianceRisk: 'No critical compliance issue',
    lastCheck: '2026-04-15',
    description: 'Munich: Stable operations.'
  }
];
