import { useState, useMemo, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Label } from 'recharts';
import {
  type VPUnitGroup, type VPFacility, type VPCompetitor, type PriceChange, type NonStorageUnit,
  recommendStreetRate, checkHierarchyViolations, get90DayTrend,
  generateMonthlyHistory, buildActivityWindow, computeCompAvg, TIER_WEIGHTS, VP_OVERRIDE_REASONS,
} from './vacant-pricing-engine';

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS (same as ECRI)
// ═══════════════════════════════════════════════════════

const C = {
  bg: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  positive: '#10B981',
  warning: '#F59E0B',
  negative: '#EF4444',
  info: '#3B82F6',
  aiAccent: '#6366F1',
  hover: '#F8FAFC',
  activeNav: '#0F172A',
};

const occColor = (pct: number) => pct > 90 ? C.positive : pct >= 75 ? C.warning : C.negative;
const netColor = (n: number) => n > 0 ? C.positive : n < 0 ? C.negative : C.textMuted;
const netArrow = (n: number) => n > 0 ? '↑' : n < 0 ? '↓' : '→';
const qualityColor = (q: 'A' | 'B' | 'C') =>
  q === 'A' ? C.positive : q === 'B' ? C.info : C.warning;
const modeLabel = (m: string) =>
  m === 'PRICE_TO_ACTIVITY' ? 'Price to Activity' : m === 'PRICE_TO_MARKET' ? 'Price to Market' : 'Balanced';
const modeColor = (m: string) =>
  m === 'PRICE_TO_ACTIVITY' ? C.positive : m === 'PRICE_TO_MARKET' ? C.info : C.warning;

// ── Daily breakdown generator (deterministic from totals) ──
function generateDailyBreakdown(days: number, totalIns: number, totalOuts: number): { ins: number[]; outs: number[] } {
  const ins = new Array(days).fill(0);
  const outs = new Array(days).fill(0);
  let seed = days * 17 + totalIns * 7 + totalOuts * 3;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < totalIns; i++) ins[Math.floor(rand() * days)]++;
  for (let i = 0; i < totalOuts; i++) outs[Math.floor(rand() * days)]++;
  return { ins, outs };
}

// ── Inline sparkline (SVG) ──
function RateSparkline({ history, finalRate }: { history: PriceChange[]; finalRate: number }) {
  if (history.length === 0) return null;
  // Build points: historical rates + final
  const rates = [...history].reverse().map(p => p.previousRate);
  rates.push(history[0].newRate); // most recent change result
  if (finalRate !== rates[rates.length - 1]) rates.push(finalRate); // pending change

  if (rates.length < 2) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const pad = 2;
  const points = rates.map((r, i) => {
    const x = pad + (i / (rates.length - 1)) * (w - pad * 2);
    const y = h - pad - ((r - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const lastRate = rates[rates.length - 1];
  const prevRate = rates[rates.length - 2];
  const trending = lastRate > prevRate ? C.positive : lastRate < prevRate ? C.negative : C.textMuted;

  return (
    <svg width={w} height={h} style={{ verticalAlign: 'middle', marginLeft: 4 }}>
      <polyline points={points} fill="none" stroke={C.textMuted} strokeWidth={1} opacity={0.4} />
      <circle cx={pad + ((rates.length - 1) / (rates.length - 1)) * (w - pad * 2)} cy={h - pad - ((lastRate - min) / range) * (h - pad * 2)} r={2.5} fill={trending} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// MOCK DATA — Morningstar-realistic
// ═══════════════════════════════════════════════════════

function buildUnitGroup(raw: {
  id: string;
  facilityId: string;
  name: string;
  unitSize: string;
  features: string;
  accessType: 'Ground' | 'Interior' | 'Drive-Up';
  totalUnits: number;
  occupiedUnits: number;
  streetRate: number;
  achievedMedian: number;
  activity7: [number, number];
  activity14: [number, number];
  activity30: [number, number];
  competitors: VPCompetitor[];
  priceHistory: PriceChange[];
  hierarchyRank: number;
}): VPUnitGroup {
  const vacantUnits = raw.totalUnits - raw.occupiedUnits;
  const occupancyPct = Math.round((raw.occupiedUnits / raw.totalUnits) * 100 * 10) / 10;
  const gap = raw.achievedMedian > 0
    ? Math.round(((raw.streetRate - raw.achievedMedian) / raw.achievedMedian) * 100) / 100
    : 0;
  const day7 = buildActivityWindow(raw.activity7[0], raw.activity7[1]);
  const day14 = buildActivityWindow(raw.activity14[0], raw.activity14[1]);
  const day30 = buildActivityWindow(raw.activity30[0], raw.activity30[1]);
  const compAvg = computeCompAvg(raw.competitors);
  const reco = recommendStreetRate(
    raw.streetRate, raw.achievedMedian, occupancyPct,
    raw.unitSize, raw.totalUnits, { day7, day14 }, compAvg,
  );

  const hasAlert = reco.direction !== 'HOLD' || occupancyPct < 75 || Math.abs(gap) > 0.15;

  return {
    id: raw.id,
    facilityId: raw.facilityId,
    name: raw.name,
    unitSize: raw.unitSize,
    features: raw.features,
    accessType: raw.accessType,
    totalUnits: raw.totalUnits,
    occupiedUnits: raw.occupiedUnits,
    vacantUnits,
    occupancyPct,
    streetRate: raw.streetRate,
    achievedMedian: raw.achievedMedian,
    streetVsAchievedGap: gap,
    activity: { day7, day14, day30: buildActivityWindow(raw.activity30[0], raw.activity30[1]) },
    competitors: raw.competitors,
    compWeightedAvg: compAvg,
    lastChange: raw.priceHistory.length > 0 ? raw.priceHistory[0] : null,
    priceHistory: raw.priceHistory,
    hierarchyRank: raw.hierarchyRank,
    recommendation: reco,
    overrideRate: null,
    overrideReason: '',
    finalRate: reco.newRate,
    hasAlert,
    alertReason: hasAlert
      ? occupancyPct < 75 ? 'Low occupancy' : reco.direction === 'DECREASE' ? 'Declining demand' : 'Price adjustment needed'
      : '',
  };
}

// ── Competitors (reusable across unit groups) ──

const corneliusComps: Record<string, VPCompetitor[]> = {
  '10x10': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 147, lastSeen: 'Jan 24' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 165, lastSeen: 'Jan 20' },
    { name: 'SecureSpace', tier: 'C', distance: 3.4, rateForSize: 123, lastSeen: 'Jan 26' },
  ],
  '10x20': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 295, lastSeen: 'Jan 24' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 310, lastSeen: 'Jan 20' },
  ],
  '5x10': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 97, lastSeen: 'Jan 24' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 109, lastSeen: 'Jan 20' },
    { name: 'SecureSpace', tier: 'C', distance: 3.4, rateForSize: 82, lastSeen: 'Jan 26' },
  ],
  '10x30': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 380, lastSeen: 'Jan 24' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 425, lastSeen: 'Jan 20' },
  ],
  '5x5': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 62, lastSeen: 'Jan 24' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 75, lastSeen: 'Jan 20' },
  ],
  '10x15': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 185, lastSeen: 'Jan 24' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 205, lastSeen: 'Jan 20' },
  ],
};

const ftlComps: Record<string, VPCompetitor[]> = {
  '10x10': [
    { name: 'Public Storage', tier: 'B', distance: 2.1, rateForSize: 162, lastSeen: 'Jan 18' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 185, lastSeen: 'Jan 20' },
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 155, lastSeen: 'Jan 24' },
  ],
  '5x10': [
    { name: 'Life Storage', tier: 'B', distance: 2.3, rateForSize: 125, lastSeen: 'Jan 24' },
    { name: 'StorageMart', tier: 'B', distance: 3.7, rateForSize: 107, lastSeen: 'Jan 6' },
  ],
  '10x20': [
    { name: 'Public Storage', tier: 'B', distance: 2.1, rateForSize: 225, lastSeen: 'Jan 18' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 240, lastSeen: 'Jan 20' },
  ],
  '10x30': [
    { name: 'Public Storage', tier: 'B', distance: 2.1, rateForSize: 350, lastSeen: 'Jan 18' },
    { name: 'CubeSmart', tier: 'A', distance: 1.8, rateForSize: 395, lastSeen: 'Jan 20' },
  ],
};

const athensComps: Record<string, VPCompetitor[]> = {
  '10x10': [
    { name: 'StorageMax', tier: 'B', distance: 1.5, rateForSize: 138, lastSeen: 'Jan 15' },
    { name: 'Life Storage', tier: 'B', distance: 2.8, rateForSize: 145, lastSeen: 'Jan 22' },
    { name: 'Public Storage', tier: 'B', distance: 3.2, rateForSize: 132, lastSeen: 'Jan 18' },
  ],
  '10x20': [
    { name: 'StorageMax', tier: 'B', distance: 1.5, rateForSize: 220, lastSeen: 'Jan 15' },
    { name: 'Life Storage', tier: 'B', distance: 2.8, rateForSize: 235, lastSeen: 'Jan 22' },
  ],
  '5x10': [
    { name: 'StorageMax', tier: 'B', distance: 1.5, rateForSize: 85, lastSeen: 'Jan 15' },
    { name: 'Public Storage', tier: 'B', distance: 3.2, rateForSize: 92, lastSeen: 'Jan 18' },
  ],
  '10x15': [
    { name: 'StorageMax', tier: 'B', distance: 1.5, rateForSize: 170, lastSeen: 'Jan 15' },
    { name: 'Life Storage', tier: 'B', distance: 2.8, rateForSize: 180, lastSeen: 'Jan 22' },
  ],
};

const MOCK_UNIT_GROUPS: VPUnitGroup[] = [
  // ═══ CORNELIUS (f1) ═══
  buildUnitGroup({
    id: 'vp1', facilityId: 'f1', name: '10×10 CC Ground', unitSize: '10x10', features: 'CC', accessType: 'Ground',
    totalUnits: 50, occupiedUnits: 45, streetRate: 134, achievedMedian: 154,
    activity7: [5, 2], activity14: [8, 5], activity30: [15, 10],
    competitors: corneliusComps['10x10'], hierarchyRank: 1,
    priceHistory: [
      { date: 'Feb 5', previousRate: 129, newRate: 134, change: 5, source: 'recommendation' },
      { date: 'Jan 22', previousRate: 124, newRate: 129, change: 5, source: 'manual' },
    ],
  }),
  buildUnitGroup({
    id: 'vp2', facilityId: 'f1', name: '10×20 CC Drive-Up', unitSize: '10x20', features: 'CC · DU', accessType: 'Drive-Up',
    totalUnits: 50, occupiedUnits: 42, streetRate: 199, achievedMedian: 222,
    activity7: [3, 2], activity14: [5, 6], activity30: [12, 12],
    competitors: corneliusComps['10x20'], hierarchyRank: 5,
    priceHistory: [
      { date: 'Jan 29', previousRate: 189, newRate: 199, change: 10, source: 'manual' },
    ],
  }),
  buildUnitGroup({
    id: 'vp3', facilityId: 'f1', name: '5×10 NCC', unitSize: '5x10', features: 'NCC', accessType: 'Interior',
    totalUnits: 36, occupiedUnits: 32, streetRate: 89, achievedMedian: 84,
    activity7: [2, 2], activity14: [4, 3], activity30: [8, 6],
    competitors: corneliusComps['5x10'], hierarchyRank: 4,
    priceHistory: [
      { date: 'Feb 3', previousRate: 85, newRate: 89, change: 4, source: 'recommendation' },
    ],
  }),
  buildUnitGroup({
    id: 'vp4', facilityId: 'f1', name: '10×30 CC Drive-Up', unitSize: '10x30', features: 'CC · DU', accessType: 'Drive-Up',
    totalUnits: 26, occupiedUnits: 18, streetRate: 259, achievedMedian: 290,
    activity7: [0, 2], activity14: [1, 4], activity30: [3, 7],
    competitors: corneliusComps['10x30'], hierarchyRank: 5,
    priceHistory: [
      { date: 'Jan 15', previousRate: 269, newRate: 259, change: -10, source: 'manual' },
    ],
  }),
  buildUnitGroup({
    id: 'vp5', facilityId: 'f1', name: '5×5 CC Interior', unitSize: '5x5', features: 'CC', accessType: 'Interior',
    totalUnits: 20, occupiedUnits: 19, streetRate: 65, achievedMedian: 72,
    activity7: [2, 1], activity14: [3, 1], activity30: [6, 3],
    competitors: corneliusComps['5x5'], hierarchyRank: 3,
    priceHistory: [
      { date: 'Feb 7', previousRate: 59, newRate: 65, change: 6, source: 'recommendation' },
    ],
  }),
  buildUnitGroup({
    id: 'vp6', facilityId: 'f1', name: '10×15 NCC Ground', unitSize: '10x15', features: 'NCC', accessType: 'Ground',
    totalUnits: 30, occupiedUnits: 24, streetRate: 175, achievedMedian: 168,
    activity7: [1, 1], activity14: [3, 3], activity30: [6, 7],
    competitors: corneliusComps['10x15'], hierarchyRank: 2,
    priceHistory: [],
  }),

  // ═══ FORT LAUDERDALE (f2) ═══
  buildUnitGroup({
    id: 'vp7', facilityId: 'f2', name: '10×10 NCC', unitSize: '10x10', features: 'NCC', accessType: 'Interior',
    totalUnits: 42, occupiedUnits: 38, streetRate: 155, achievedMedian: 145,
    activity7: [4, 1], activity14: [7, 5], activity30: [14, 10],
    competitors: ftlComps['10x10'], hierarchyRank: 3,
    priceHistory: [
      { date: 'Feb 5', previousRate: 149, newRate: 155, change: 6, source: 'recommendation' },
    ],
  }),
  buildUnitGroup({
    id: 'vp8', facilityId: 'f2', name: '5×10 CC', unitSize: '5x10', features: 'CC · FF', accessType: 'Ground',
    totalUnits: 30, occupiedUnits: 28, streetRate: 119, achievedMedian: 105,
    activity7: [3, 1], activity14: [5, 2], activity30: [10, 5],
    competitors: ftlComps['5x10'], hierarchyRank: 1,
    priceHistory: [
      { date: 'Feb 3', previousRate: 115, newRate: 119, change: 4, source: 'recommendation' },
      { date: 'Jan 20', previousRate: 109, newRate: 115, change: 6, source: 'manual' },
    ],
  }),
  buildUnitGroup({
    id: 'vp9', facilityId: 'f2', name: '10×20 NCC Drive-Up', unitSize: '10x20', features: 'NCC · DU', accessType: 'Drive-Up',
    totalUnits: 24, occupiedUnits: 20, streetRate: 215, achievedMedian: 200,
    activity7: [1, 2], activity14: [2, 4], activity30: [5, 6],
    competitors: ftlComps['10x20'], hierarchyRank: 5,
    priceHistory: [
      { date: 'Jan 29', previousRate: 219, newRate: 215, change: -4, source: 'manual' },
    ],
  }),
  buildUnitGroup({
    id: 'vp10', facilityId: 'f2', name: '10×10 CC Ground', unitSize: '10x10', features: 'CC', accessType: 'Ground',
    totalUnits: 35, occupiedUnits: 33, streetRate: 179, achievedMedian: 185,
    activity7: [3, 1], activity14: [5, 3], activity30: [11, 7],
    competitors: ftlComps['10x10'], hierarchyRank: 1,
    priceHistory: [
      { date: 'Feb 5', previousRate: 175, newRate: 179, change: 4, source: 'recommendation' },
    ],
  }),
  buildUnitGroup({
    id: 'vp11', facilityId: 'f2', name: '10×30 NCC', unitSize: '10x30', features: 'NCC', accessType: 'Interior',
    totalUnits: 18, occupiedUnits: 11, streetRate: 280, achievedMedian: 310,
    activity7: [0, 1], activity14: [1, 3], activity30: [2, 7],
    competitors: ftlComps['10x30'], hierarchyRank: 4,
    priceHistory: [
      { date: 'Feb 3', previousRate: 295, newRate: 280, change: -15, source: 'manual' },
    ],
  }),

  // ═══ ATHENS WEST (f3) ═══
  buildUnitGroup({
    id: 'vp12', facilityId: 'f3', name: '10×10 NCC', unitSize: '10x10', features: 'NCC', accessType: 'Interior',
    totalUnits: 40, occupiedUnits: 36, streetRate: 125, achievedMedian: 125,
    activity7: [3, 2], activity14: [5, 4], activity30: [10, 8],
    competitors: athensComps['10x10'], hierarchyRank: 3,
    priceHistory: [
      { date: 'Feb 5', previousRate: 119, newRate: 125, change: 6, source: 'recommendation' },
    ],
  }),
  buildUnitGroup({
    id: 'vp13', facilityId: 'f3', name: '10×20 CC Drive-Up', unitSize: '10x20', features: 'CC · DU', accessType: 'Drive-Up',
    totalUnits: 28, occupiedUnits: 20, streetRate: 215, achievedMedian: 210,
    activity7: [1, 2], activity14: [2, 3], activity30: [5, 8],
    competitors: athensComps['10x20'], hierarchyRank: 5,
    priceHistory: [
      { date: 'Jan 22', previousRate: 220, newRate: 215, change: -5, source: 'manual' },
    ],
  }),
  buildUnitGroup({
    id: 'vp14', facilityId: 'f3', name: '5×10 NCC', unitSize: '5x10', features: 'NCC', accessType: 'Interior',
    totalUnits: 25, occupiedUnits: 23, streetRate: 79, achievedMedian: 82,
    activity7: [3, 1], activity14: [4, 3], activity30: [9, 6],
    competitors: athensComps['5x10'], hierarchyRank: 4,
    priceHistory: [],
  }),
  buildUnitGroup({
    id: 'vp15', facilityId: 'f3', name: '10×15 CC Interior', unitSize: '10x15', features: 'CC', accessType: 'Interior',
    totalUnits: 22, occupiedUnits: 18, streetRate: 165, achievedMedian: 172,
    activity7: [2, 2], activity14: [3, 2], activity30: [7, 7],
    competitors: athensComps['10x15'], hierarchyRank: 3,
    priceHistory: [
      { date: 'Feb 1', previousRate: 159, newRate: 165, change: 6, source: 'recommendation' },
    ],
  }),
  buildUnitGroup({
    id: 'vp16', facilityId: 'f3', name: '10×10 CC Ground', unitSize: '10x10', features: 'CC', accessType: 'Ground',
    totalUnits: 32, occupiedUnits: 30, streetRate: 149, achievedMedian: 155,
    activity7: [2, 1], activity14: [4, 2], activity30: [8, 5],
    competitors: athensComps['10x10'], hierarchyRank: 1,
    priceHistory: [
      { date: 'Feb 7', previousRate: 145, newRate: 149, change: 4, source: 'recommendation' },
    ],
  }),
];

// ── Facility-level data ──

function buildFacility(id: string, name: string, city: string, state: string, fund: string,
  baseOcc: number, baseStreet: number, baseAchieved: number): VPFacility {
  const groups = MOCK_UNIT_GROUPS.filter(g => g.facilityId === id);
  const totalUnits = groups.reduce((s, g) => s + g.totalUnits, 0);
  const occupiedUnits = groups.reduce((s, g) => s + g.occupiedUnits, 0);
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyPct = Math.round((occupiedUnits / totalUnits) * 1000) / 10;
  const history = generateMonthlyHistory(baseOcc, baseStreet, baseAchieved, 36);
  const trend = get90DayTrend(history);
  const attentionCount = groups.filter(g => g.hasAlert).length;

  const d7ins = groups.reduce((s, g) => s + g.activity.day7.moveIns, 0);
  const d7outs = groups.reduce((s, g) => s + g.activity.day7.moveOuts, 0);
  const d14ins = groups.reduce((s, g) => s + g.activity.day14.moveIns, 0);
  const d14outs = groups.reduce((s, g) => s + g.activity.day14.moveOuts, 0);
  const d30ins = groups.reduce((s, g) => s + g.activity.day30.moveIns, 0);
  const d30outs = groups.reduce((s, g) => s + g.activity.day30.moveOuts, 0);

  return {
    id, name, city, state, fund,
    totalUnits, occupiedUnits, vacantUnits, occupancyPct,
    occupancyTrend: trend,
    attentionCount,
    lastPriceChangeDate: 'Feb 7',
    monthlyHistory: history,
    facilityActivity: {
      day7: buildActivityWindow(d7ins, d7outs),
      day14: buildActivityWindow(d14ins, d14outs),
      day30: buildActivityWindow(d30ins, d30outs),
    },
  };
}

const VP_FACILITIES: VPFacility[] = [
  buildFacility('f1', 'Cornelius', 'Cornelius', 'NC', 'Fund I', 85, 140, 165),
  buildFacility('f2', 'Fort Lauderdale Central', 'Fort Lauderdale', 'FL', 'Fund II', 87, 170, 190),
  buildFacility('f3', 'Athens West', 'Athens', 'GA', 'Fund I', 83, 130, 150),
];

// ── Non-Storage / Commercial Leases ──
const MOCK_NON_STORAGE: NonStorageUnit[] = [
  {
    id: 'ns1', facilityId: 'f1', spaceName: 'Retail Suite A', tenantName: 'Blue Ridge Insurance',
    leaseType: 'Retail', monthlyRent: 2800, sqft: 1200, leaseStart: 'Mar 2024', leaseEnd: 'Feb 2027',
    scheduledIncreases: [{ year: 2, pct: 3 }, { year: 3, pct: 3 }],
    status: 'Active', notes: 'Triple net lease. Tenant handles utilities + maintenance.',
  },
  {
    id: 'ns2', facilityId: 'f1', spaceName: 'Office 201', tenantName: 'Lakeside Property Mgmt',
    leaseType: 'Office', monthlyRent: 1500, sqft: 650, leaseStart: 'Jun 2023', leaseEnd: 'May 2026',
    scheduledIncreases: [{ year: 2, pct: 2.5 }, { year: 3, pct: 2.5 }],
    status: 'Expiring Soon', notes: 'Renewal discussion pending. Tenant wants 3-year extension.',
  },
  {
    id: 'ns3', facilityId: 'f2', spaceName: 'Warehouse Bay 1', tenantName: 'Coastal Moving Co.',
    leaseType: 'Warehouse', monthlyRent: 4200, sqft: 3000, leaseStart: 'Jan 2025', leaseEnd: 'Dec 2027',
    scheduledIncreases: [{ year: 2, pct: 4 }, { year: 3, pct: 4 }],
    status: 'Active', notes: 'Loading dock access included. Shared parking.',
  },
  {
    id: 'ns4', facilityId: 'f2', spaceName: 'Retail Suite B', tenantName: 'Vacant',
    leaseType: 'Retail', monthlyRent: 0, sqft: 900, leaseStart: '', leaseEnd: '',
    scheduledIncreases: [],
    status: 'Expired', notes: 'Previous tenant (nail salon) vacated Oct 2025. Listed at $2,100/mo.',
  },
  {
    id: 'ns5', facilityId: 'f3', spaceName: 'Office 101', tenantName: 'Athens Tax Services',
    leaseType: 'Office', monthlyRent: 1100, sqft: 500, leaseStart: 'Sep 2024', leaseEnd: 'Aug 2026',
    scheduledIncreases: [{ year: 2, pct: 3 }],
    status: 'Active', notes: '',
  },
  {
    id: 'ns6', facilityId: 'f3', spaceName: 'Cell Tower Pad', tenantName: 'T-Mobile',
    leaseType: 'Other', monthlyRent: 1800, sqft: 0, leaseStart: 'Apr 2020', leaseEnd: 'Mar 2030',
    scheduledIncreases: [{ year: 2, pct: 2 }, { year: 3, pct: 2 }, { year: 4, pct: 2 }, { year: 5, pct: 2 }],
    status: 'Active', notes: '10-year lease with 2% annual escalation. Auto-renews.',
  },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

interface VacantPricingDashboardProps {
  selectedFacilityId: string;
  onSelectFacility: (id: string) => void;
}

// ── localStorage helpers ──
const STORAGE_KEY = 'vp-session';
function loadSession(): { overrides: Record<string, number | null>; reasons: Record<string, string>; notes: Record<string, string>; facilityNotes: Record<string, string>; applied: string[]; week: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function VacantPricingDashboard({ selectedFacilityId, onSelectFacility }: VacantPricingDashboardProps) {
  const saved = useMemo(() => loadSession(), []);

  const [unitGroups, setUnitGroups] = useState<VPUnitGroup[]>(() => {
    if (!saved) return MOCK_UNIT_GROUPS;
    return MOCK_UNIT_GROUPS.map(g => {
      const ov = saved.overrides[g.id];
      const reason = saved.reasons[g.id] || '';
      if (ov !== undefined && ov !== null) {
        return { ...g, overrideRate: ov, overrideReason: reason, finalRate: ov };
      }
      return g;
    });
  });
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [facilitySearch, setFacilitySearch] = useState('');
  const [hoveredFacilityId, setHoveredFacilityId] = useState<string | null>(null);
  const [appliedGroupIds, setAppliedGroupIds] = useState<Set<string>>(() =>
    saved ? new Set(saved.applied) : new Set(),
  );
  const [showExportToast, setShowExportToast] = useState(false);
  const [pricingSubTab, setPricingSubTab] = useState<'unit-groups' | 'non-storage'>('unit-groups');
  const [fundFilter, setFundFilter] = useState<string>('all');
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState<'all' | 'increases' | 'decreases' | 'holds' | 'alerts'>('all');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupNotes, setGroupNotes] = useState<Record<string, string>>(saved?.notes || {});
  const [pricingWeek, setPricingWeek] = useState(() => saved?.week || new Date().toISOString().slice(0, 10));
  const [showDmSummary, setShowDmSummary] = useState(false);
  const [dmCopied, setDmCopied] = useState(false);
  const [chartOpen, setChartOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [facilityNotes, setFacilityNotes] = useState<Record<string, string>>(saved?.facilityNotes || {});
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBatchOverride, setShowBatchOverride] = useState(false);
  const [batchPct, setBatchPct] = useState('');
  const [facilitySortMode, setFacilitySortMode] = useState<'attention' | 'occupancy' | 'review'>('attention');

  // ── Persist session to localStorage ──
  useEffect(() => {
    const overrides: Record<string, number | null> = {};
    const reasons: Record<string, string> = {};
    for (const g of unitGroups) {
      if (g.overrideRate !== null) {
        overrides[g.id] = g.overrideRate;
        reasons[g.id] = g.overrideReason;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      overrides,
      reasons,
      notes: groupNotes,
      facilityNotes,
      applied: [...appliedGroupIds],
      week: pricingWeek,
    }));
  }, [unitGroups, groupNotes, facilityNotes, appliedGroupIds, pricingWeek]);

  const selectedFacility = VP_FACILITIES.find(f => f.id === selectedFacilityId) || VP_FACILITIES[0];

  const facilityNonStorage = useMemo(() =>
    MOCK_NON_STORAGE.filter(ns => ns.facilityId === selectedFacilityId),
    [selectedFacilityId],
  );

  const facilityGroups = useMemo(() =>
    unitGroups.filter(g => g.facilityId === selectedFacilityId),
    [unitGroups, selectedFacilityId],
  );

  const displayGroups = useMemo(() => {
    let list = facilityGroups;
    if (tableFilter === 'increases') list = list.filter(g => g.finalRate > g.streetRate);
    else if (tableFilter === 'decreases') list = list.filter(g => g.finalRate < g.streetRate);
    else if (tableFilter === 'holds') list = list.filter(g => g.finalRate === g.streetRate);
    else if (tableFilter === 'alerts') list = list.filter(g => g.hasAlert);

    if (sortCol) {
      const getValue = (g: VPUnitGroup): number => {
        switch (sortCol) {
          case 'total': return g.totalUnits;
          case 'vacant': return g.vacantUnits;
          case 'occ': return g.occupancyPct;
          case '7d': return g.activity.day7.net;
          case '14d': return g.activity.day14.net;
          case '30d': return g.activity.day30.net;
          case 'street': return g.streetRate;
          case 'gap': return g.streetVsAchievedGap;
          case 'reco': return g.recommendation.newRate;
          case 'final': return g.finalRate;
          default: return 0;
        }
      };
      const mult = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => (getValue(a) - getValue(b)) * mult);
    }
    return list;
  }, [facilityGroups, tableFilter, sortCol, sortDir]);

  const allFunds = useMemo(() =>
    [...new Set(VP_FACILITIES.map(f => f.fund))].sort(),
    [],
  );

  const filteredFacilities = useMemo(() => {
    let list = [...VP_FACILITIES];
    if (fundFilter !== 'all') list = list.filter(f => f.fund === fundFilter);
    if (facilitySearch.trim()) {
      const s = facilitySearch.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(s) || f.city.toLowerCase().includes(s),
      );
    }
    if (facilitySortMode === 'attention') {
      list.sort((a, b) => b.attentionCount - a.attentionCount);
    } else if (facilitySortMode === 'occupancy') {
      list.sort((a, b) => a.occupancyPct - b.occupancyPct);
    } else if (facilitySortMode === 'review') {
      // Unreviewed first: sort by % applied ascending
      list.sort((a, b) => {
        const ga = unitGroups.filter(g => g.facilityId === a.id);
        const gb = unitGroups.filter(g => g.facilityId === b.id);
        const pctA = ga.length > 0 ? ga.filter(g => appliedGroupIds.has(g.id)).length / ga.length : 1;
        const pctB = gb.length > 0 ? gb.filter(g => appliedGroupIds.has(g.id)).length / gb.length : 1;
        return pctA - pctB;
      });
    }
    return list;
  }, [facilitySearch, fundFilter, facilitySortMode, unitGroups, appliedGroupIds]);

  const portfolioStats = useMemo(() => {
    const totalFac = VP_FACILITIES.length;
    const totalGroups = unitGroups.length;
    const totalApplied = unitGroups.filter(g => appliedGroupIds.has(g.id)).length;
    const totalChanges = unitGroups.filter(g => g.finalRate !== g.streetRate).length;
    const totalAlerts = unitGroups.filter(g => g.hasAlert).length;
    const avgOcc = VP_FACILITIES.reduce((s, f) => s + f.occupancyPct, 0) / totalFac;
    const completedFacilities = VP_FACILITIES.filter(f => {
      const groups = unitGroups.filter(g => g.facilityId === f.id);
      return groups.length > 0 && groups.every(g => appliedGroupIds.has(g.id));
    }).length;
    return { totalFac, totalGroups, totalApplied, totalChanges, totalAlerts, avgOcc, completedFacilities };
  }, [unitGroups, appliedGroupIds]);

  const violations = useMemo(() =>
    checkHierarchyViolations(facilityGroups),
    [facilityGroups],
  );

  const violatedGroupIds = useMemo(() =>
    new Set(violations.map(v => v.groupId)),
    [violations],
  );

  const handleOverride = (groupId: string, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    setUnitGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const rate = num !== null && !isNaN(num) ? Math.round(num) : null;
      return { ...g, overrideRate: rate, finalRate: rate ?? g.recommendation.newRate };
    }));
  };

  const handleOverrideReason = (groupId: string, reason: string) => {
    setUnitGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, overrideReason: reason } : g,
    ));
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const handleClearOverride = (groupId: string) => {
    setUnitGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, overrideRate: null, overrideReason: '', finalRate: g.recommendation.newRate } : g,
    ));
  };

  const handleSelectFacility = (id: string) => {
    onSelectFacility(id);
    setExpandedGroupId(null);
    setTableFilter('all');
    setSortCol('');
    setPricingSubTab('unit-groups');
    setSelectedGroupIds(new Set());
  };

  // ── Summary stats ──
  const summaryStats = useMemo(() => {
    const increases = facilityGroups.filter(g => g.finalRate > g.streetRate);
    const decreases = facilityGroups.filter(g => g.finalRate < g.streetRate);
    const holds = facilityGroups.filter(g => g.finalRate === g.streetRate);
    const overridden = facilityGroups.filter(g => g.overrideRate !== null);
    const applied = facilityGroups.filter(g => appliedGroupIds.has(g.id));
    const totalChange = facilityGroups.reduce((sum, g) => sum + (g.finalRate - g.streetRate), 0);
    const avgChangePct = facilityGroups.length > 0
      ? facilityGroups.reduce((sum, g) => {
          if (g.streetRate === 0) return sum;
          return sum + ((g.finalRate - g.streetRate) / g.streetRate) * 100;
        }, 0) / facilityGroups.length
      : 0;
    return {
      total: facilityGroups.length,
      increases: increases.length,
      decreases: decreases.length,
      holds: holds.length,
      overridden: overridden.length,
      applied: applied.length,
      pending: facilityGroups.length - applied.length,
      totalChange,
      avgChangePct,
      violationCount: violations.length,
    };
  }, [facilityGroups, appliedGroupIds, violations]);

  // ── Revenue impact ──
  const revenueImpact = useMemo(() => {
    // Monthly impact from rate changes on existing occupied units (rent roll effect)
    // and potential revenue from vacant units filling at new rate
    let occupiedImpact = 0;
    let vacantPotential = 0;
    let prevVacantPotential = 0;
    for (const g of facilityGroups) {
      const delta = g.finalRate - g.streetRate;
      // Existing tenants eventually converge to street rate, so occupied impact is directional
      occupiedImpact += delta * g.occupiedUnits;
      // Vacant units at new vs old rate
      vacantPotential += g.finalRate * g.vacantUnits;
      prevVacantPotential += g.streetRate * g.vacantUnits;
    }
    const vacantDelta = vacantPotential - prevVacantPotential;
    const totalVacant = facilityGroups.reduce((s, g) => s + g.vacantUnits, 0);
    return {
      occupiedMonthly: occupiedImpact,
      vacantMonthly: vacantDelta,
      totalMonthly: occupiedImpact + vacantDelta,
      annualized: (occupiedImpact + vacantDelta) * 12,
      totalVacant,
    };
  }, [facilityGroups]);

  // ── Chart axis domains (tight to data) ──
  const chartDomains = useMemo(() => {
    const h = selectedFacility.monthlyHistory;
    if (h.length === 0) return { occ: [70, 100] as [number, number], rate: [50, 200] as [number, number] };

    let occMin = Infinity, occMax = -Infinity;
    let rateMin = Infinity, rateMax = -Infinity;
    for (const pt of h) {
      if (pt.occupancyPct < occMin) occMin = pt.occupancyPct;
      if (pt.occupancyPct > occMax) occMax = pt.occupancyPct;
      if (pt.streetRate < rateMin) rateMin = pt.streetRate;
      if (pt.achievedRate < rateMin) rateMin = pt.achievedRate;
      if (pt.streetRate > rateMax) rateMax = pt.streetRate;
      if (pt.achievedRate > rateMax) rateMax = pt.achievedRate;
    }

    // Round down/up to nice increments with padding
    const occFloor = Math.floor((occMin - 2) / 5) * 5;
    const occCeil = Math.min(100, Math.ceil((occMax + 2) / 5) * 5);
    const rateFloor = Math.floor((rateMin - 5) / 10) * 10;
    const rateCeil = Math.ceil((rateMax + 5) / 10) * 10;

    return {
      occ: [Math.max(0, occFloor), occCeil] as [number, number],
      rate: [Math.max(0, rateFloor), rateCeil] as [number, number],
    };
  }, [selectedFacility]);

  // ── Season-over-season comparison ──
  const seasonComparison = useMemo(() => {
    const h = selectedFacility.monthlyHistory;
    if (h.length < 13) return null;
    const current = h[h.length - 1];
    const lastYear = h[h.length - 13];
    const prior3 = h.slice(-4, -1);
    const avg3Occ = prior3.reduce((s, p) => s + p.occupancyPct, 0) / prior3.length;
    const avg3Street = prior3.reduce((s, p) => s + p.streetRate, 0) / prior3.length;
    const avg3Achieved = prior3.reduce((s, p) => s + p.achievedRate, 0) / prior3.length;
    return {
      current,
      lastYear,
      deltaOcc: +(current.occupancyPct - lastYear.occupancyPct).toFixed(1),
      deltaStreet: current.streetRate - lastYear.streetRate,
      deltaAchieved: current.achievedRate - lastYear.achievedRate,
      prior3AvgOcc: +avg3Occ.toFixed(1),
      prior3AvgStreet: Math.round(avg3Street),
      prior3AvgAchieved: Math.round(avg3Achieved),
      delta3Occ: +(current.occupancyPct - avg3Occ).toFixed(1),
      delta3Street: current.streetRate - Math.round(avg3Street),
      delta3Achieved: current.achievedRate - Math.round(avg3Achieved),
    };
  }, [selectedFacility]);

  // ── Per-facility progress (for left panel) ──
  const facilityProgress = useMemo(() => {
    const result: Record<string, { total: number; applied: number; changes: number }> = {};
    for (const f of VP_FACILITIES) {
      const groups = unitGroups.filter(g => g.facilityId === f.id);
      const applied = groups.filter(g => appliedGroupIds.has(g.id));
      const changes = groups.filter(g => g.finalRate !== g.streetRate).length;
      result[f.id] = { total: groups.length, applied: applied.length, changes };
    }
    return result;
  }, [unitGroups, appliedGroupIds]);

  // ── Apply / Export handlers ──
  const handleApplyGroup = (groupId: string) => {
    setAppliedGroupIds(prev => { const n = new Set(prev); n.add(groupId); return n; });
  };

  const handleUnapplyGroup = (groupId: string) => {
    setAppliedGroupIds(prev => { const n = new Set(prev); n.delete(groupId); return n; });
  };

  const handleApplyAll = () => {
    setAppliedGroupIds(new Set(facilityGroups.map(g => g.id)));
  };

  const handleClearAllApplied = () => {
    setAppliedGroupIds(new Set());
  };

  const handleResetSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUnitGroups(MOCK_UNIT_GROUPS);
    setAppliedGroupIds(new Set());
    setGroupNotes({});
    setFacilityNotes({});
    setExpandedGroupId(null);
    setTableFilter('all');
    setSortCol('');
    setPricingWeek(new Date().toISOString().slice(0, 10));
    setSelectedGroupIds(new Set());
    setShowResetConfirm(false);
  };

  const handleBatchOverride = () => {
    const pct = parseFloat(batchPct);
    if (isNaN(pct) || pct === 0) return;
    const mult = 1 + pct / 100;
    setUnitGroups(prev => prev.map(g => {
      if (!selectedGroupIds.has(g.id)) return g;
      const newRate = Math.round(g.streetRate * mult);
      return { ...g, overrideRate: newRate, overrideReason: `Batch ${pct > 0 ? '+' : ''}${pct}%`, finalRate: newRate };
    }));
    setSelectedGroupIds(new Set());
    setShowBatchOverride(false);
    setBatchPct('');
  };

  const toggleSelectGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const n = new Set(prev);
      if (n.has(groupId)) n.delete(groupId); else n.add(groupId);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGroupIds.size === displayGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(displayGroups.map(g => g.id)));
    }
  };

  const handleExportCSV = () => {
    const applied = facilityGroups.filter(g => appliedGroupIds.has(g.id));
    const rows = applied.length > 0 ? applied : facilityGroups;
    const headers = [
      'Facility', 'Unit Group', 'Size', 'Access', 'Total Units', 'Occupied', 'Vacant',
      'Occ%', 'Current Street', 'Recommended', 'Direction', 'Change $', 'Final Rate',
      'Override', 'Override Reason', 'Pricing Mode', 'Confidence', 'Comp Avg', 'Rationale', 'DM Notes',
    ];
    const csvRows = rows.map(g => [
      selectedFacility.name,
      g.name,
      g.unitSize,
      g.accessType,
      g.totalUnits,
      g.occupiedUnits,
      g.vacantUnits,
      g.occupancyPct,
      g.streetRate,
      g.recommendation.newRate,
      g.recommendation.direction,
      g.finalRate - g.streetRate,
      g.finalRate,
      g.overrideRate !== null ? 'Yes' : 'No',
      g.overrideReason || '',
      g.recommendation.pricingMode,
      g.recommendation.confidence,
      g.compWeightedAvg || '',
      `"${g.recommendation.rationale.replace(/"/g, '""')}"`,
      `"${(groupNotes[g.id] || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacant-pricing-${selectedFacility.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 3000);
  };

  // ── DM Review Summary ──
  const dmSummaryText = useMemo(() => {
    const f = selectedFacility;
    const changed = facilityGroups.filter(g => g.finalRate !== g.streetRate);
    const overridden = facilityGroups.filter(g => g.overrideRate !== null);
    const lines: string[] = [];
    lines.push(`WEEKLY PRICING REVIEW — ${f.name}`);
    lines.push(`Week of ${pricingWeek} | ${f.city}, ${f.state} | ${f.fund}`);
    lines.push(`Occupancy: ${f.occupancyPct}% (${f.totalUnits} units, ${f.vacantUnits} vacant)`);
    lines.push('');
    lines.push(`SUMMARY: ${summaryStats.increases} increases, ${summaryStats.decreases} decreases, ${summaryStats.holds} holds`);
    if (revenueImpact.totalMonthly !== 0) {
      lines.push(`Est. Revenue Impact: ${revenueImpact.totalMonthly > 0 ? '+' : ''}$${revenueImpact.totalMonthly.toLocaleString()}/mo ($${revenueImpact.annualized.toLocaleString()}/yr)`);
    }
    if (overridden.length > 0) lines.push(`Overrides: ${overridden.length}`);
    if (violations.length > 0) lines.push(`Hierarchy Violations: ${violations.length}`);
    lines.push('');

    if (changed.length > 0) {
      lines.push('RATE CHANGES:');
      for (const g of changed) {
        const delta = g.finalRate - g.streetRate;
        let line = `  ${g.name}: $${g.streetRate} → $${g.finalRate} (${delta > 0 ? '+' : ''}$${delta})`;
        if (g.overrideRate !== null) line += ` [Override: ${g.overrideReason || 'No reason'}]`;
        lines.push(line);
        if (groupNotes[g.id]) lines.push(`    Note: ${groupNotes[g.id]}`);
      }
      lines.push('');
    }

    const holds = facilityGroups.filter(g => g.finalRate === g.streetRate);
    if (holds.length > 0) {
      lines.push(`HOLDS (${holds.length}): ${holds.map(g => `${g.name} ($${g.streetRate})`).join(', ')}`);
      lines.push('');
    }

    if (violations.length > 0) {
      lines.push('HIERARCHY ALERTS:');
      for (const v of violations) lines.push(`  ⚠ ${v.reason}`);
      lines.push('');
    }

    const fNote = facilityNotes[f.id];
    if (fNote && fNote.trim()) {
      lines.push('FACILITY NOTES:');
      lines.push(`  ${fNote.trim()}`);
      lines.push('');
    }

    lines.push(`Generated ${new Date().toLocaleString()} — ManageSpace Vacant Pricing`);
    return lines.join('\n');
  }, [selectedFacility, facilityGroups, summaryStats, revenueImpact, violations, groupNotes, facilityNotes, pricingWeek]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'SELECT') return;

    const groups = displayGroups;
    if (groups.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      const curIdx = groups.findIndex(g => g.id === expandedGroupId);
      const nextIdx = curIdx < groups.length - 1 ? curIdx + 1 : 0;
      setExpandedGroupId(groups[nextIdx].id);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      const curIdx = groups.findIndex(g => g.id === expandedGroupId);
      const prevIdx = curIdx > 0 ? curIdx - 1 : groups.length - 1;
      setExpandedGroupId(groups[prevIdx].id);
    } else if (e.key === 'Escape') {
      setExpandedGroupId(null);
    } else if (e.key === 'a' && expandedGroupId) {
      e.preventDefault();
      if (appliedGroupIds.has(expandedGroupId)) {
        handleUnapplyGroup(expandedGroupId);
      } else {
        handleApplyGroup(expandedGroupId);
      }
    } else if (e.key === ' ' && expandedGroupId) {
      e.preventDefault();
      toggleSelectGroup(expandedGroupId);
    }
  }, [displayGroups, expandedGroupId, appliedGroupIds, selectedGroupIds]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Auto-scroll to expanded group ──
  useEffect(() => {
    if (expandedGroupId) {
      setTimeout(() => {
        const el = document.getElementById(`ug-${expandedGroupId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [expandedGroupId]);

  // ── Render ──
  return (
    <>
      <style>{`
        .vp-table-row:hover { background: ${C.hover} !important; }
        .vp-table-row td { transition: background 0.1s ease; }
      `}</style>
      {/* ════════ LEFT PANEL — FACILITY SELECTOR ════════ */}
      <div style={{
        width: 320, display: 'flex', flexDirection: 'column',
        background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        {/* ── Portfolio Summary ── */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted }}>
              Portfolio
            </span>
            <span style={{ fontSize: 11, color: C.textMuted }}>
              Avg {portfolioStats.avgOcc.toFixed(1)}% occ
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            <span style={{ color: C.textSecondary }}>
              <strong style={{ color: C.textPrimary }}>{portfolioStats.completedFacilities}</strong>/{portfolioStats.totalFac} done
            </span>
            <span style={{ color: C.textSecondary }}>
              <strong style={{ color: C.positive }}>{portfolioStats.totalApplied}</strong>/{portfolioStats.totalGroups} applied
            </span>
            {portfolioStats.totalAlerts > 0 && (
              <span style={{ color: C.warning }}>
                {portfolioStats.totalAlerts} alerts
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, width: '100%', height: 4, borderRadius: 2, background: '#E2E8F0' }}>
            <div style={{
              width: portfolioStats.totalGroups > 0 ? `${(portfolioStats.totalApplied / portfolioStats.totalGroups) * 100}%` : '0%',
              height: '100%', borderRadius: 2, background: C.positive, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted }}>
              Facilities
            </span>
          </div>
          <input
            type="text"
            placeholder="Search facilities..."
            value={facilitySearch}
            onChange={e => setFacilitySearch(e.target.value)}
            style={{
              width: '100%', marginTop: 12, padding: '8px 12px', borderRadius: 6,
              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
              background: C.bg, color: C.textPrimary, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {['all', ...allFunds].map(f => (
              <button
                key={f}
                onClick={() => setFundFilter(f)}
                style={{
                  padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: fundFilter === f ? C.activeNav : C.bg,
                  color: fundFilter === f ? '#fff' : C.textMuted,
                }}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 10, color: C.textMuted, lineHeight: '22px' }}>Sort:</span>
            {([
              { key: 'attention' as const, label: 'Attention' },
              { key: 'occupancy' as const, label: 'Low Occ' },
              { key: 'review' as const, label: 'Unreviewed' },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => setFacilitySortMode(s.key)}
                style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                  cursor: 'pointer', border: 'none',
                  background: facilitySortMode === s.key ? C.info : 'transparent',
                  color: facilitySortMode === s.key ? '#fff' : C.textMuted,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {filteredFacilities.map(facility => {
            const isSelected = facility.id === selectedFacilityId;
            const isHovered = hoveredFacilityId === facility.id;
            const trendSymbol = facility.occupancyTrend === 'up' ? '↑' : facility.occupancyTrend === 'down' ? '↓' : '→';
            const trendColor = facility.occupancyTrend === 'up' ? C.positive : facility.occupancyTrend === 'down' ? C.negative : C.textMuted;
            const fp = facilityProgress[facility.id];
            const allApplied = fp && fp.total > 0 && fp.applied === fp.total;
            return (
              <div
                key={facility.id}
                onClick={() => handleSelectFacility(facility.id)}
                onMouseEnter={() => setHoveredFacilityId(facility.id)}
                onMouseLeave={() => setHoveredFacilityId(null)}
                style={{
                  padding: '12px 14px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                  background: isSelected ? C.card : isHovered ? C.hover : 'transparent',
                  borderLeft: isSelected ? `3px solid ${allApplied ? C.positive : C.activeNav}` : '3px solid transparent',
                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
                    {allApplied && <span style={{ color: C.positive, marginRight: 4 }}>✓</span>}
                    {facility.name}
                  </div>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{facility.fund}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{facility.city}, {facility.state}</div>
                <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                  {facility.totalUnits} units · <span style={{ color: occColor(facility.occupancyPct), fontWeight: 600 }}>
                    {facility.occupancyPct}%
                  </span> occ <span style={{ color: trendColor }}>{trendSymbol}</span>
                  {facility.attentionCount > 0 && !allApplied && (
                    <span style={{ color: C.warning, marginLeft: 8 }}>⚑ {facility.attentionCount} need attention</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  Last change: {facility.lastPriceChangeDate}
                </div>
                {/* Occupancy bar */}
                <div style={{ marginTop: 6, width: '100%', height: 4, borderRadius: 2, background: '#E2E8F0' }}>
                  <div style={{
                    width: `${Math.min(100, facility.occupancyPct)}%`, height: '100%', borderRadius: 2,
                    background: occColor(facility.occupancyPct), transition: 'width 0.3s ease',
                  }} />
                </div>
                {/* Applied progress */}
                {fp && fp.total > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#E2E8F0' }}>
                      <div style={{
                        width: `${(fp.applied / fp.total) * 100}%`, height: '100%', borderRadius: 2,
                        background: C.positive, transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      {fp.applied}/{fp.total} applied · {fp.changes} changes
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header + Summary Bar ── */}
        <div style={{ padding: '16px 24px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                {selectedFacility.name}
              </h1>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Week of</span>
                <input
                  type="date"
                  value={pricingWeek}
                  onChange={e => setPricingWeek(e.target.value)}
                  style={{
                    padding: '1px 6px', borderRadius: 4, border: `1px solid ${C.border}`,
                    fontSize: 12, color: C.textPrimary, background: C.bg, outline: 'none',
                  }}
                />
                <span>— {selectedFacility.city}, {selectedFacility.state}</span>
              </div>
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                {selectedFacility.totalUnits} units · {selectedFacility.vacantUnits} vacant · <span style={{
                  color: occColor(selectedFacility.occupancyPct), fontWeight: 600,
                }}>{selectedFacility.occupancyPct}% occ</span>
                <span style={{ marginLeft: 8 }}>
                  90-day trend: <span style={{ color: selectedFacility.occupancyTrend === 'up' ? C.positive : selectedFacility.occupancyTrend === 'down' ? C.negative : C.textMuted, fontWeight: 600 }}>
                    {selectedFacility.occupancyTrend === 'up' ? '↑ Up' : selectedFacility.occupancyTrend === 'down' ? '↓ Down' : '→ Flat'}
                  </span>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {summaryStats.pending > 0 && (
                <button
                  onClick={handleApplyAll}
                  style={{
                    padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: C.positive, color: '#fff', fontSize: 13, fontWeight: 600,
                  }}
                >
                  Apply All ({summaryStats.pending})
                </button>
              )}
              <button
                onClick={() => setShowDmSummary(true)}
                style={{
                  padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${C.aiAccent}40`, background: '#F5F3FF',
                  color: C.aiAccent, fontSize: 13, fontWeight: 600,
                }}
              >
                DM Summary
              </button>
              {summaryStats.applied > 0 && (
                <button
                  onClick={handleClearAllApplied}
                  style={{
                    padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${C.border}`, background: C.card,
                    color: C.textSecondary, fontSize: 13, fontWeight: 500,
                  }}
                >
                  Clear Applied ({summaryStats.applied})
                </button>
              )}
              <button
                onClick={handleExportCSV}
                style={{
                  padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${C.border}`, background: C.card,
                  color: C.textSecondary, fontSize: 13, fontWeight: 500,
                }}
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                title="Clear all overrides, notes, and applied states"
                style={{
                  padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${C.border}`, background: C.card,
                  color: C.textMuted, fontSize: 13,
                }}
              >
                ↺
              </button>
            </div>
          </div>

          {/* ── Summary Stats Row ── */}
          <div style={{
            display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Groups', value: String(summaryStats.total), color: C.textPrimary },
              { label: 'Increases', value: String(summaryStats.increases), color: C.positive },
              { label: 'Decreases', value: String(summaryStats.decreases), color: C.negative },
              { label: 'Holds', value: String(summaryStats.holds), color: C.textMuted },
              {
                label: 'Net Change',
                value: `${summaryStats.totalChange >= 0 ? '+' : ''}$${summaryStats.totalChange}`,
                color: summaryStats.totalChange >= 0 ? C.positive : C.negative,
              },
              {
                label: 'Avg Change',
                value: `${summaryStats.avgChangePct >= 0 ? '+' : ''}${summaryStats.avgChangePct.toFixed(1)}%`,
                color: summaryStats.avgChangePct >= 0 ? C.positive : C.negative,
              },
              ...(summaryStats.overridden > 0 ? [{ label: 'Overrides', value: String(summaryStats.overridden), color: C.warning }] : []),
              ...(summaryStats.violationCount > 0 ? [{ label: 'Violations', value: String(summaryStats.violationCount), color: C.negative }] : []),
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '6px 14px', borderRadius: 6, background: C.bg,
                border: `1px solid ${C.border}`, fontSize: 12,
              }}>
                <span style={{ color: C.textMuted }}>{stat.label}: </span>
                <span style={{ fontWeight: 700, color: stat.color }}>{stat.value}</span>
              </div>
            ))}
            {/* Progress indicator */}
            <div style={{
              padding: '6px 14px', borderRadius: 6, background: C.bg,
              border: `1px solid ${C.border}`, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: C.textMuted }}>Applied:</span>
              <span style={{ fontWeight: 700, color: summaryStats.applied === summaryStats.total ? C.positive : C.textPrimary }}>
                {summaryStats.applied}/{summaryStats.total}
              </span>
              <div style={{ width: 60, height: 4, borderRadius: 2, background: '#E2E8F0' }}>
                <div style={{
                  width: summaryStats.total > 0 ? `${(summaryStats.applied / summaryStats.total) * 100}%` : '0%',
                  height: '100%', borderRadius: 2, background: C.positive, transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
            {/* Revenue impact */}
            {revenueImpact.totalMonthly !== 0 && (
              <div style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12,
                background: revenueImpact.totalMonthly > 0 ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${revenueImpact.totalMonthly > 0 ? '#BBF7D0' : '#FECACA'}`,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ color: C.textMuted }}>Est. Impact:</span>
                <span style={{
                  fontWeight: 700,
                  color: revenueImpact.totalMonthly > 0 ? C.positive : C.negative,
                }}>
                  {revenueImpact.totalMonthly > 0 ? '+' : ''}${revenueImpact.totalMonthly.toLocaleString()}/mo
                </span>
                <span style={{ color: C.textMuted, fontSize: 10 }}>
                  ({revenueImpact.annualized > 0 ? '+' : ''}${revenueImpact.annualized.toLocaleString()}/yr)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* ════ FINALIZATION BANNER ════ */}
          {summaryStats.applied === summaryStats.total && summaryStats.total > 0 && (
            <div style={{
              padding: '14px 20px', borderRadius: 10, marginBottom: 16,
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.positive }}>
                  All {summaryStats.total} unit groups applied
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                  {summaryStats.increases} increase{summaryStats.increases !== 1 ? 's' : ''} · {summaryStats.decreases} decrease{summaryStats.decreases !== 1 ? 's' : ''} · {summaryStats.holds} hold{summaryStats.holds !== 1 ? 's' : ''}
                  {summaryStats.overridden > 0 && ` · ${summaryStats.overridden} override${summaryStats.overridden !== 1 ? 's' : ''}`}
                  {' · '}Net {summaryStats.totalChange >= 0 ? '+' : ''}${summaryStats.totalChange}
                  {revenueImpact.totalMonthly !== 0 && (
                    <span style={{ fontWeight: 600 }}>
                      {' · '}Est. {revenueImpact.totalMonthly > 0 ? '+' : ''}${revenueImpact.totalMonthly.toLocaleString()}/mo
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: C.positive, color: '#fff', fontSize: 13, fontWeight: 600,
                }}
              >
                Export Final CSV
              </button>
            </div>
          )}

          {/* ════ SECTION A: STORE HEALTH CHART ════ */}
          <div style={{
            background: C.card, borderRadius: 10,
            border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden',
          }}>
            <div
              onClick={() => setChartOpen(prev => !prev)}
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: C.textMuted }}>{chartOpen ? '▼' : '▶'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Store Health — 3 Year Trend</span>
              </div>
              {!chartOpen && seasonComparison && (
                <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                  <span style={{ color: C.textMuted }}>
                    Occ <strong style={{ color: occColor(seasonComparison.current.occupancyPct) }}>{seasonComparison.current.occupancyPct}%</strong>
                  </span>
                  <span style={{ color: C.textMuted }}>
                    YoY <strong style={{ color: seasonComparison.deltaOcc > 0 ? C.positive : seasonComparison.deltaOcc < 0 ? C.negative : C.textMuted }}>
                      {seasonComparison.deltaOcc > 0 ? '+' : ''}{seasonComparison.deltaOcc}pp
                    </strong>
                  </span>
                </div>
              )}
            </div>
            {chartOpen && <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.textMuted, marginBottom: 8 }}>
              <span><span style={{ color: C.info }}>━━</span> Occupancy %</span>
              <span><span style={{ color: C.warning }}>╌╌</span> Street Rate</span>
              <span><span style={{ color: C.positive }}>╌╌</span> Achieved Rate</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={selectedFacility.monthlyHistory} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.textMuted }} interval={5} />
                <YAxis
                  yAxisId="pct"
                  domain={chartDomains.occ}
                  tick={{ fontSize: 9, fill: C.info }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={42}
                >
                  <Label
                    value="Occupancy"
                    angle={-90}
                    position="insideLeft"
                    offset={4}
                    style={{ fontSize: 10, fontWeight: 600, fill: C.info, textAnchor: 'middle' }}
                  />
                </YAxis>
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={chartDomains.rate}
                  tick={{ fontSize: 9, fill: C.warning }}
                  tickFormatter={(v: number) => `$${v}`}
                  width={48}
                >
                  <Label
                    value="Rate ($)"
                    angle={90}
                    position="insideRight"
                    offset={4}
                    style={{ fontSize: 10, fontWeight: 600, fill: C.warning, textAnchor: 'middle' }}
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}` }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number, name: string) =>
                    name === 'Occupancy %' ? [`${value.toFixed(1)}%`, name] : [`$${value}`, name]
                  }
                />
                <Line yAxisId="pct" dataKey="occupancyPct" stroke={C.info} strokeWidth={2.5} dot={false} name="Occupancy %" />
                <Line yAxisId="rate" dataKey="streetRate" stroke={C.warning} strokeWidth={1.5} dot={false} name="Street Rate" strokeDasharray="6 3" />
                <Line yAxisId="rate" dataKey="achievedRate" stroke={C.positive} strokeWidth={1.5} dot={false} name="Achieved Rate" strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>

            {/* ── Season-over-Season Comparison ── */}
            {seasonComparison && (
              <div style={{
                display: 'flex', gap: 0, marginTop: 12, borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${C.border}`,
              }}>
                {/* Current Month */}
                <div style={{ flex: 1, padding: '10px 14px', background: C.bg, borderRight: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {seasonComparison.current.month} (Current)
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div>
                      <span style={{ color: C.textMuted }}>Occ </span>
                      <span style={{ fontWeight: 700, color: occColor(seasonComparison.current.occupancyPct) }}>
                        {seasonComparison.current.occupancyPct}%
                      </span>
                    </div>
                    <div>
                      <span style={{ color: C.textMuted }}>Street </span>
                      <span style={{ fontWeight: 700 }}>${seasonComparison.current.streetRate}</span>
                    </div>
                    <div>
                      <span style={{ color: C.textMuted }}>Achieved </span>
                      <span style={{ fontWeight: 700 }}>${seasonComparison.current.achievedRate}</span>
                    </div>
                  </div>
                </div>

                {/* vs Same Month Last Year */}
                <div style={{ flex: 1, padding: '10px 14px', background: C.card, borderRight: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    vs {seasonComparison.lastYear.month} (Last Year)
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    {[
                      { label: 'Occ', delta: seasonComparison.deltaOcc, suffix: 'pp' },
                      { label: 'Street', delta: seasonComparison.deltaStreet, prefix: '$' },
                      { label: 'Achieved', delta: seasonComparison.deltaAchieved, prefix: '$' },
                    ].map(m => (
                      <div key={m.label}>
                        <span style={{ color: C.textMuted }}>{m.label} </span>
                        <span style={{
                          fontWeight: 700,
                          color: m.delta > 0 ? C.positive : m.delta < 0 ? C.negative : C.textMuted,
                        }}>
                          {m.delta > 0 ? '+' : ''}{m.prefix || ''}{m.delta}{m.suffix || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* vs Prior 3 Months Avg */}
                <div style={{ flex: 1, padding: '10px 14px', background: C.card }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    vs Prior 3-Month Avg
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    {[
                      { label: 'Occ', delta: seasonComparison.delta3Occ, suffix: 'pp' },
                      { label: 'Street', delta: seasonComparison.delta3Street, prefix: '$' },
                      { label: 'Achieved', delta: seasonComparison.delta3Achieved, prefix: '$' },
                    ].map(m => (
                      <div key={m.label}>
                        <span style={{ color: C.textMuted }}>{m.label} </span>
                        <span style={{
                          fontWeight: 700,
                          color: m.delta > 0 ? C.positive : m.delta < 0 ? C.negative : C.textMuted,
                        }}>
                          {m.delta > 0 ? '+' : ''}{m.prefix || ''}{m.delta}{m.suffix || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>}
          </div>

          {/* ════ SECTION B: ACTIVITY DASHBOARD (collapsible) ════ */}
          <div style={{
            background: C.card, borderRadius: 10,
            border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden',
          }}>
            <div
              onClick={() => setActivityOpen(prev => !prev)}
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: C.textMuted }}>{activityOpen ? '▼' : '▶'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Activity Dashboard</span>
              </div>
              {!activityOpen && (
                <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                  {[
                    { label: '7d', data: selectedFacility.facilityActivity.day7 },
                    { label: '14d', data: selectedFacility.facilityActivity.day14 },
                    { label: '30d', data: selectedFacility.facilityActivity.day30 },
                  ].map(w => (
                    <span key={w.label} style={{ color: C.textMuted }}>
                      {w.label} <strong style={{ color: netColor(w.data.net) }}>{w.data.net > 0 ? '+' : ''}{w.data.net}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {activityOpen && (
            <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px' }}>
            {[
              { label: 'Last 7 Days', days: 7, data: selectedFacility.facilityActivity.day7 },
              { label: 'Last 14 Days', days: 14, data: selectedFacility.facilityActivity.day14 },
              { label: 'Last 30 Days', days: 30, data: selectedFacility.facilityActivity.day30 },
            ].map(w => {
              const nc = netColor(w.data.net);
              const bgTint = w.data.net > 0 ? '#F0FDF4' : w.data.net < 0 ? '#FEF2F2' : C.card;
              const daily = generateDailyBreakdown(w.days, w.data.moveIns, w.data.moveOuts);
              const maxDay = Math.max(...daily.ins, ...daily.outs, 1);
              const cellSize = w.days <= 7 ? 24 : w.days <= 14 ? 14 : 7;
              const cellGap = w.days <= 7 ? 3 : w.days <= 14 ? 2 : 1;

              return (
                <div key={w.label} style={{
                  flex: 1, padding: '14px 16px', borderRadius: 10,
                  background: bgTint, border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${nc}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {w.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: nc, lineHeight: 1, marginBottom: 10 }}>
                    {w.data.net > 0 ? '+' : ''}{w.data.net}{' '}
                    <span style={{ fontSize: 16 }}>{netArrow(w.data.net)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>
                    <span><span style={{ color: C.positive, fontWeight: 700 }}>{w.data.moveIns}</span> move-ins</span>
                    <span><span style={{ fontWeight: 700, color: C.textSecondary }}>{w.data.moveOuts}</span> move-outs</span>
                  </div>
                  {/* Heatmap strip */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: C.textMuted, width: 22, textAlign: 'right', flexShrink: 0 }}>IN</span>
                      <div style={{ display: 'flex', gap: cellGap, flex: 1 }}>
                        {daily.ins.map((v, i) => (
                          <div key={i} title={`Day ${i + 1}: ${v} move-in${v !== 1 ? 's' : ''}`} style={{
                            flex: 1, height: cellSize, borderRadius: cellSize <= 8 ? 1 : 3,
                            background: C.positive, opacity: v === 0 ? 0.08 : 0.15 + (v / maxDay) * 0.85,
                          }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: C.textMuted, width: 22, textAlign: 'right', flexShrink: 0 }}>OUT</span>
                      <div style={{ display: 'flex', gap: cellGap, flex: 1 }}>
                        {daily.outs.map((v, i) => (
                          <div key={i} title={`Day ${i + 1}: ${v} move-out${v !== 1 ? 's' : ''}`} style={{
                            flex: 1, height: cellSize, borderRadius: cellSize <= 8 ? 1 : 3,
                            background: C.textSecondary, opacity: v === 0 ? 0.08 : 0.15 + (v / maxDay) * 0.85,
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted, marginTop: 3, paddingLeft: 26 }}>
                    <span>{w.days}d ago</span>
                    <span>today</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* ── Facility Notes ── */}
          <div style={{
            padding: '8px 16px', marginBottom: 12, background: C.card, borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>
              Facility Notes
            </div>
            <textarea
              value={facilityNotes[selectedFacility.id] || ''}
              onChange={e => setFacilityNotes(prev => ({ ...prev, [selectedFacility.id]: e.target.value }))}
              placeholder="Notes about this facility (seasonal factors, local market changes, DM feedback...)"
              style={{
                width: '100%', minHeight: 48, maxHeight: 120, padding: '6px 8px', fontSize: 12,
                border: `1px solid ${C.border}`, borderRadius: 6, resize: 'vertical',
                fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                color: C.textPrimary, background: C.bg, outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = C.info; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </div>
          </div>

          {/* ════ SECTION C: UNIT GROUP PRICING TABLE ════ */}
          <div style={{
            background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {([
                  { key: 'unit-groups' as const, label: 'Unit Groups', count: facilityGroups.length },
                  { key: 'non-storage' as const, label: 'Non-Storage Leases', count: facilityNonStorage.length },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setPricingSubTab(tab.key)}
                    style={{
                      padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: 'none', borderBottom: `2px solid ${pricingSubTab === tab.key ? C.activeNav : 'transparent'}`,
                      background: 'transparent',
                      color: pricingSubTab === tab.key ? C.textPrimary : C.textMuted,
                    }}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              {pricingSubTab === 'unit-groups' && facilityGroups.some(g => g.hasAlert) && (
                <span style={{ fontSize: 12, color: C.warning }}>
                  ⚑ {facilityGroups.filter(g => g.hasAlert).length} need attention
                </span>
              )}
            </div>
            {pricingSubTab === 'unit-groups' ? (
            <>
            {/* Quick filters */}
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.textMuted, marginRight: 4 }}>Show:</span>
              {([
                { key: 'all' as const, label: 'All', count: facilityGroups.length },
                { key: 'increases' as const, label: 'Increases', count: facilityGroups.filter(g => g.finalRate > g.streetRate).length },
                { key: 'decreases' as const, label: 'Decreases', count: facilityGroups.filter(g => g.finalRate < g.streetRate).length },
                { key: 'holds' as const, label: 'Holds', count: facilityGroups.filter(g => g.finalRate === g.streetRate).length },
                { key: 'alerts' as const, label: 'Alerts', count: facilityGroups.filter(g => g.hasAlert).length },
              ]).filter(f => f.count > 0 || f.key === 'all').map(f => (
                <button
                  key={f.key}
                  onClick={() => setTableFilter(f.key)}
                  style={{
                    padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: tableFilter === f.key ? C.activeNav : C.bg,
                    color: tableFilter === f.key ? '#fff' : C.textMuted,
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
              {sortCol && (
                <button
                  onClick={() => { setSortCol(''); setSortDir('desc'); }}
                  style={{
                    marginLeft: 'auto', padding: '3px 8px', borderRadius: 4, fontSize: 10,
                    border: `1px solid ${C.border}`, background: C.card, color: C.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  Clear sort
                </button>
              )}
            </div>
            {/* Batch Selection Bar */}
            {selectedGroupIds.size > 0 && (
              <div style={{
                padding: '8px 16px', borderBottom: `1px solid ${C.border}`,
                background: '#EFF6FF', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.info }}>
                  {selectedGroupIds.size} selected
                </span>
                <button
                  onClick={() => {
                    for (const id of selectedGroupIds) handleApplyGroup(id);
                    setSelectedGroupIds(new Set());
                  }}
                  style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    border: 'none', background: C.positive, color: '#fff', cursor: 'pointer',
                  }}
                >
                  Apply Selected
                </button>
                <button
                  onClick={() => setShowBatchOverride(true)}
                  style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer',
                  }}
                >
                  Batch % Adjust
                </button>
                <button
                  onClick={() => setSelectedGroupIds(new Set())}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11,
                    border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer',
                  }}
                >
                  Deselect
                </button>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: 24 }} />
                  <col />
                  <col style={{ width: 42 }} />
                  <col style={{ width: 42 }} />
                  <col style={{ width: 50 }} />
                  <col style={{ width: 38 }} />
                  <col style={{ width: 38 }} />
                  <col style={{ width: 38 }} />
                  <col style={{ width: 58 }} />
                  <col style={{ width: 52 }} />
                  <col style={{ width: 75 }} />
                  <col style={{ width: 60 }} />
                  <col style={{ width: 60 }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: C.card }}>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    <th style={{ padding: '8px 4px', width: 28, background: C.card }}>
                      <input
                        type="checkbox"
                        checked={displayGroups.length > 0 && selectedGroupIds.size === displayGroups.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', accentColor: C.info }}
                      />
                    </th>
                    {([
                      { label: '', key: '', align: 'left' },
                      { label: 'Unit Group', key: '', align: 'left' },
                      { label: 'Total', key: 'total', align: 'right' },
                      { label: 'Vacant', key: 'vacant', align: 'right' },
                      { label: 'Occ%', key: 'occ', align: 'right' },
                      { label: '7d', key: '7d', align: 'right' },
                      { label: '14d', key: '14d', align: 'right' },
                      { label: '30d', key: '30d', align: 'right' },
                      { label: 'Street', key: 'street', align: 'right' },
                      { label: 'Gap', key: 'gap', align: 'right' },
                      { label: 'Reco', key: 'reco', align: 'right' },
                      { label: 'Final', key: 'final', align: 'right' },
                      { label: 'Action', key: '', align: 'center' },
                    ] as const).map((h, i) => (
                      <th
                        key={i}
                        onClick={h.key ? () => handleSort(h.key) : undefined}
                        style={{
                          padding: '8px 4px', fontWeight: 600, color: sortCol === h.key ? C.textPrimary : C.textMuted,
                          fontSize: 11, textAlign: h.align as 'left' | 'right' | 'center', whiteSpace: 'nowrap',
                          cursor: h.key ? 'pointer' : 'default', userSelect: 'none', background: C.card,
                        }}
                      >
                        {h.label}
                        {sortCol === h.key && (
                          <span style={{ marginLeft: 2, fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                  {displayGroups.map(g => {
                    const isExpanded = expandedGroupId === g.id;
                    const hasViolation = violatedGroupIds.has(g.id);
                    const isApplied = appliedGroupIds.has(g.id);
                    return (
                      <tbody key={g.id} id={`ug-${g.id}`}>
                        <tr
                          className="vp-table-row"
                          onClick={() => setExpandedGroupId(prev => prev === g.id ? null : g.id)}
                          style={{
                            borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
                            background: isApplied ? '#F0FDF4' : hasViolation ? '#FEF2F2' : g.hasAlert ? '#FFFBEB' : selectedGroupIds.has(g.id) ? '#EFF6FF' : 'transparent',
                            opacity: isApplied ? 0.8 : 1,
                          }}
                        >
                          <td style={{ padding: '8px 4px', width: 28 }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedGroupIds.has(g.id)}
                              onChange={() => toggleSelectGroup(g.id)}
                              style={{ cursor: 'pointer', accentColor: C.info }}
                            />
                          </td>
                          <td style={{ padding: '8px 6px', width: 20 }}>
                            <span style={{ fontSize: 10, color: C.textMuted }}>{isExpanded ? '▼' : '▶'}</span>
                          </td>
                          <td style={{ padding: '8px 6px', fontWeight: 500 }}>
                            {isApplied && <span style={{ color: C.positive, marginRight: 4 }}>✓</span>}
                            {g.name}
                            {g.hasAlert && !isApplied && <span style={{ marginLeft: 6, color: C.warning }}>⚑</span>}
                            {hasViolation && <span style={{ marginLeft: 4, color: C.negative, fontSize: 10 }}>⚠</span>}
                            {groupNotes[g.id] && <span title={groupNotes[g.id]} style={{ marginLeft: 4, fontSize: 10, color: C.aiAccent }}>✎</span>}
                            <RateSparkline history={g.priceHistory} finalRate={g.finalRate} />
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right' }}>{g.totalUnits}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', color: g.vacantUnits > 5 ? C.negative : C.textSecondary }}>
                            {g.vacantUnits}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: occColor(g.occupancyPct) }}>
                            {g.occupancyPct}%
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', color: netColor(g.activity.day7.net), fontWeight: 500 }}>
                            {g.activity.day7.net > 0 ? '+' : ''}{g.activity.day7.net}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', color: netColor(g.activity.day14.net), fontWeight: 500 }}>
                            {g.activity.day14.net > 0 ? '+' : ''}{g.activity.day14.net}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', color: netColor(g.activity.day30.net), fontWeight: 500 }}>
                            {g.activity.day30.net > 0 ? '+' : ''}{g.activity.day30.net}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>${g.streetRate}</td>
                          <td style={{
                            padding: '8px 4px', textAlign: 'right', fontSize: 11, fontWeight: 600,
                            color: g.streetVsAchievedGap < -0.10 ? C.negative : g.streetVsAchievedGap > 0.05 ? C.warning : C.textMuted,
                          }}>
                            {g.streetVsAchievedGap >= 0 ? '+' : ''}{(g.streetVsAchievedGap * 100).toFixed(0)}%
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                            <span style={{
                              color: g.recommendation.direction === 'INCREASE' ? C.positive
                                : g.recommendation.direction === 'DECREASE' ? C.negative : C.textMuted,
                              fontWeight: 600,
                            }}>
                              ${g.recommendation.newRate} {g.recommendation.direction === 'INCREASE' ? '↑' : g.recommendation.direction === 'DECREASE' ? '↓' : '→'}
                            </span>
                          </td>
                          <td style={{
                            padding: '8px 4px', textAlign: 'right', fontWeight: 700,
                            color: g.overrideRate !== null ? C.warning : C.textPrimary,
                          }}>
                            ${g.finalRate}
                            {g.overrideRate !== null && <span style={{ fontSize: 9, marginLeft: 2 }}>✎</span>}
                            {g.compWeightedAvg > 0 && g.finalRate > g.compWeightedAvg && (
                              <span title={`Above comp avg ($${g.compWeightedAvg})`} style={{ fontSize: 9, color: C.negative, marginLeft: 2 }}>▲</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            {isApplied ? (
                              <button
                                onClick={e => { e.stopPropagation(); handleUnapplyGroup(g.id); }}
                                style={{
                                  padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                                  border: `1px solid ${C.border}`, background: C.card,
                                  color: C.textSecondary, cursor: 'pointer',
                                }}
                              >
                                Undo
                              </button>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); handleApplyGroup(g.id); }}
                                style={{
                                  padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                  border: 'none', background: C.positive,
                                  color: '#fff', cursor: 'pointer',
                                }}
                              >
                                Apply
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* ── EXPANDED DETAIL ── */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={14} style={{ padding: 0, borderBottom: `1px solid ${C.border}` }}>
                              <div style={{ padding: '16px 24px', background: C.bg }}>

                                {/* Override + Rationale */}
                                <div style={{
                                  display: 'flex', gap: 24, marginBottom: 16, alignItems: 'flex-start', flexWrap: 'wrap',
                                }}>
                                  <div style={{
                                    padding: 14, borderRadius: 8, background: isApplied ? '#F0FDF4' : C.card,
                                    border: `1px solid ${isApplied ? '#BBF7D0' : C.border}`, minWidth: 220,
                                  }}>
                                    {isApplied ? (
                                      <>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: C.positive, marginBottom: 8 }}>
                                          Applied — Final Rate
                                        </div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }}>
                                          ${g.finalRate}
                                          {g.overrideRate !== null && (
                                            <span style={{ fontSize: 11, color: C.warning, marginLeft: 6, fontWeight: 500 }}>overridden</span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                                          {g.finalRate !== g.streetRate
                                            ? `${g.finalRate > g.streetRate ? '+' : ''}$${g.finalRate - g.streetRate} from $${g.streetRate}`
                                            : 'No change from current street rate'}
                                        </div>
                                        {g.overrideRate !== null && g.overrideReason && (
                                          <div style={{
                                            marginTop: 6, padding: '4px 8px', borderRadius: 4,
                                            background: `${C.warning}10`, border: `1px solid ${C.warning}25`,
                                            fontSize: 11, color: C.warning,
                                          }}>
                                            Override: {g.overrideReason}
                                          </div>
                                        )}
                                        <button
                                          onClick={e => { e.stopPropagation(); handleUnapplyGroup(g.id); }}
                                          style={{
                                            marginTop: 8, padding: '4px 12px', borderRadius: 4, fontSize: 11,
                                            border: `1px solid ${C.border}`, background: C.card,
                                            color: C.textSecondary, cursor: 'pointer',
                                          }}
                                        >
                                          Unapply to Edit
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
                                          Set Override
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <span style={{ fontSize: 12, color: C.textSecondary }}>$</span>
                                          <input
                                            type="number"
                                            value={g.overrideRate !== null ? g.overrideRate : ''}
                                            placeholder={String(g.recommendation.newRate)}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => { e.stopPropagation(); handleOverride(g.id, e.target.value); }}
                                            style={{
                                              width: 80, padding: '6px 10px', borderRadius: 6,
                                              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
                                            }}
                                          />
                                          {g.overrideRate !== null && (
                                            <button
                                              onClick={e => { e.stopPropagation(); handleClearOverride(g.id); }}
                                              style={{
                                                padding: '4px 10px', borderRadius: 4, fontSize: 11,
                                                border: `1px solid ${C.border}`, background: C.card,
                                                color: C.textSecondary, cursor: 'pointer',
                                              }}
                                            >
                                              Use Reco
                                            </button>
                                          )}
                                        </div>
                                        {/* Quick % adjustments */}
                                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                          {[
                                            { label: '-10%', mult: 0.90 },
                                            { label: '-5%', mult: 0.95 },
                                            { label: '+5%', mult: 1.05 },
                                            { label: '+10%', mult: 1.10 },
                                          ].map(adj => (
                                            <button
                                              key={adj.label}
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleOverride(g.id, String(Math.round(g.streetRate * adj.mult)));
                                              }}
                                              style={{
                                                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                border: `1px solid ${C.border}`, background: C.bg,
                                                color: adj.mult > 1 ? C.positive : C.negative,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              {adj.label}
                                            </button>
                                          ))}
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              if (g.compWeightedAvg > 0) handleOverride(g.id, String(g.compWeightedAvg));
                                            }}
                                            title={g.compWeightedAvg > 0 ? `Match comp avg $${g.compWeightedAvg}` : 'No comp data'}
                                            style={{
                                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                              border: `1px solid ${C.border}`, background: C.bg,
                                              color: g.compWeightedAvg > 0 ? C.info : C.textMuted,
                                              cursor: g.compWeightedAvg > 0 ? 'pointer' : 'default',
                                              opacity: g.compWeightedAvg > 0 ? 1 : 0.4,
                                            }}
                                          >
                                            =Comp
                                          </button>
                                        </div>
                                        {g.overrideRate !== null && (
                                          <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Reason</div>
                                            <select
                                              value={g.overrideReason}
                                              onClick={e => e.stopPropagation()}
                                              onChange={e => { e.stopPropagation(); handleOverrideReason(g.id, e.target.value); }}
                                              style={{
                                                width: '100%', padding: '6px 10px', borderRadius: 6,
                                                border: `1px solid ${g.overrideRate !== null && !g.overrideReason ? C.warning : C.border}`,
                                                fontSize: 12, outline: 'none', background: C.card, color: C.textPrimary,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              <option value="">Select reason...</option>
                                              {VP_OVERRIDE_REASONS.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                              ))}
                                            </select>
                                            {g.overrideRate !== null && !g.overrideReason && (
                                              <div style={{ fontSize: 10, color: C.warning, marginTop: 3 }}>
                                                Reason required for overrides
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  <div style={{ flex: 1, minWidth: 300 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                                      <span style={{
                                        padding: '2px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                                        color: '#fff', background: modeColor(g.recommendation.pricingMode),
                                      }}>
                                        {modeLabel(g.recommendation.pricingMode)}
                                      </span>
                                      <span style={{
                                        padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                                        color: g.recommendation.confidence === 'HIGH' ? C.positive : C.warning,
                                        background: g.recommendation.confidence === 'HIGH' ? `${C.positive}15` : `${C.warning}15`,
                                        border: `1px solid ${g.recommendation.confidence === 'HIGH' ? `${C.positive}30` : `${C.warning}30`}`,
                                      }}>
                                        {g.recommendation.confidence} confidence
                                      </span>
                                    </div>
                                    {/* Signal Badges */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                      {[
                                        { label: 'Activity', signal: g.recommendation.activitySignal },
                                        { label: 'Market', signal: g.recommendation.marketSignal },
                                        { label: 'Achieved', signal: g.recommendation.achievedSignal },
                                      ].map(s => {
                                        const sc = s.signal === 'INCREASE' ? C.positive : s.signal === 'DECREASE' ? C.negative : C.textMuted;
                                        const arrow = s.signal === 'INCREASE' ? '↑' : s.signal === 'DECREASE' ? '↓' : '→';
                                        return (
                                          <div key={s.label} style={{
                                            display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                                            borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`,
                                            fontSize: 11,
                                          }}>
                                            <span style={{ color: C.textMuted }}>{s.label}</span>
                                            <span style={{ fontWeight: 700, color: sc }}>{arrow} {s.signal}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
                                      {g.recommendation.rationale}
                                    </div>
                                  </div>
                                </div>

                                {/* Achieved Rate Context */}
                                <div style={{
                                  display: 'flex', gap: 24, marginBottom: 16, fontSize: 12, color: C.textSecondary,
                                  padding: '10px 14px', background: C.card, borderRadius: 8, border: `1px solid ${C.border}`,
                                  flexWrap: 'wrap',
                                }}>
                                  <div><strong>Achieved Median:</strong> ${g.achievedMedian}</div>
                                  <div><strong>Street vs Achieved:</strong> <span style={{
                                    color: g.streetVsAchievedGap < -0.10 ? C.negative : C.textSecondary,
                                    fontWeight: 600,
                                  }}>{g.streetVsAchievedGap >= 0 ? '+' : ''}{(g.streetVsAchievedGap * 100).toFixed(1)}%</span></div>
                                  <div><strong>Comp Avg:</strong> {g.compWeightedAvg > 0 ? `$${g.compWeightedAvg}` : 'N/A'}</div>
                                  <div><strong>Last Change:</strong> {g.lastChange ? `${g.lastChange.date} ${g.lastChange.change >= 0 ? '+' : ''}$${g.lastChange.change}` : 'None'}</div>
                                </div>

                                {/* Activity Detail */}
                                <div style={{
                                  display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden',
                                  border: `1px solid ${C.border}`,
                                }}>
                                  {[
                                    { label: '7 Day', data: g.activity.day7 },
                                    { label: '14 Day', data: g.activity.day14 },
                                    { label: '30 Day', data: g.activity.day30 },
                                  ].map((w, i) => (
                                    <div key={w.label} style={{
                                      flex: 1, padding: '8px 12px',
                                      background: i === 0 ? C.bg : C.card,
                                      borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
                                    }}>
                                      <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                                        {w.label}
                                      </div>
                                      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                                        <div>
                                          <span style={{ color: C.positive, fontWeight: 700 }}>{w.data.moveIns}</span>
                                          <span style={{ color: C.textMuted }}> in</span>
                                        </div>
                                        <div>
                                          <span style={{ fontWeight: 700, color: C.textSecondary }}>{w.data.moveOuts}</span>
                                          <span style={{ color: C.textMuted }}> out</span>
                                        </div>
                                        <div style={{ fontWeight: 700, color: netColor(w.data.net) }}>
                                          {w.data.net > 0 ? '+' : ''}{w.data.net} net {netArrow(w.data.net)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Rate Position Visualization */}
                                {(() => {
                                  const points = [
                                    { label: 'Achieved', value: g.achievedMedian, color: C.positive },
                                    { label: 'Street', value: g.streetRate, color: C.info },
                                    ...(g.compWeightedAvg > 0 ? [{ label: 'Comp Avg', value: g.compWeightedAvg, color: C.textMuted }] : []),
                                    { label: 'Final', value: g.finalRate, color: g.finalRate > g.streetRate ? C.positive : g.finalRate < g.streetRate ? C.negative : C.textPrimary },
                                  ];
                                  const vals = points.map(p => p.value);
                                  const min = Math.min(...vals);
                                  const max = Math.max(...vals);
                                  const range = max - min || 1;
                                  const pad = range * 0.15;
                                  const lo = min - pad;
                                  const hi = max + pad;
                                  const span = hi - lo;
                                  const pct = (v: number) => ((v - lo) / span) * 100;

                                  return (
                                    <div style={{
                                      marginBottom: 16, padding: '12px 14px', background: C.card,
                                      borderRadius: 8, border: `1px solid ${C.border}`,
                                    }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 10 }}>
                                        Rate Position
                                      </div>
                                      <div style={{ position: 'relative', height: 40, marginBottom: 4 }}>
                                        {/* Track */}
                                        <div style={{
                                          position: 'absolute', top: 18, left: 0, right: 0, height: 4,
                                          borderRadius: 2, background: C.border,
                                        }} />
                                        {/* Markers */}
                                        {points.map(p => (
                                          <div key={p.label} style={{
                                            position: 'absolute', left: `${pct(p.value)}%`, top: 0,
                                            transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center',
                                          }}>
                                            <span style={{
                                              fontSize: 9, fontWeight: 700, color: p.color, whiteSpace: 'nowrap',
                                              marginBottom: 2,
                                            }}>
                                              {p.label === 'Final' ? `►$${p.value}` : `$${p.value}`}
                                            </span>
                                            <div style={{
                                              width: p.label === 'Final' ? 10 : 6,
                                              height: p.label === 'Final' ? 10 : 6,
                                              borderRadius: '50%', background: p.color,
                                              border: p.label === 'Final' ? '2px solid #fff' : 'none',
                                              boxShadow: p.label === 'Final' ? '0 0 0 1px ' + p.color : 'none',
                                            }} />
                                          </div>
                                        ))}
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 9, color: C.textMuted }}>
                                        {points.map(p => (
                                          <span key={p.label}>
                                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: p.color, marginRight: 3, verticalAlign: 'middle' }} />
                                            {p.label}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Competitor Table */}
                                {g.competitors.length > 0 && (
                                  <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>
                                      Competitors ({g.competitors.length})
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: C.card, borderRadius: 8 }}>
                                      <thead>
                                        <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                                          {['Name', 'Tier', 'Rate', 'Dist', 'Seen'].map(h => (
                                            <th key={h} style={{
                                              padding: '6px 8px', fontWeight: 600, color: C.textMuted,
                                              textAlign: h === 'Name' ? 'left' : 'right',
                                            }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {g.competitors.map((comp, i) => (
                                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 500 }}>{comp.name}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                              <span style={{
                                                display: 'inline-block', width: 20, height: 20, borderRadius: 4,
                                                textAlign: 'center', lineHeight: '20px', fontSize: 10, fontWeight: 700,
                                                color: '#fff', background: qualityColor(comp.tier),
                                              }}>{comp.tier}</span>
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>${comp.rateForSize}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textSecondary }}>{comp.distance}mi</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textMuted }}>{comp.lastSeen}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                      <div style={{ fontSize: 11, color: C.textMuted }}>
                                        Weighted avg (A={TIER_WEIGHTS.A}, B={TIER_WEIGHTS.B}, C={TIER_WEIGHTS.C}): <strong>${g.compWeightedAvg}</strong>
                                      </div>
                                      {(() => {
                                        const dates = g.competitors.map(c => c.lastSeen);
                                        const oldest = dates.sort()[0];
                                        const daysSince = oldest ? Math.floor((Date.now() - new Date(`${oldest} 2026`).getTime()) / 86400000) : 0;
                                        const stale = daysSince > 14;
                                        return (
                                          <span style={{
                                            fontSize: 10, fontWeight: 600,
                                            color: stale ? C.warning : C.textMuted,
                                          }}>
                                            {stale ? '⚠ ' : ''}Oldest data: {oldest} ({daysSince}d ago)
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Comp Rate Bar Chart */}
                                {g.competitors.length > 0 && (
                                  <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>
                                      Rate Comparison
                                    </div>
                                    <div style={{
                                      padding: '12px 14px', background: C.card, borderRadius: 8,
                                      border: `1px solid ${C.border}`,
                                    }}>
                                      {(() => {
                                        const allRates = [
                                          g.streetRate,
                                          g.finalRate,
                                          g.compWeightedAvg,
                                          ...g.competitors.map(c => c.rateForSize),
                                        ].filter(r => r > 0);
                                        const maxRate = Math.max(...allRates);
                                        const minRate = Math.min(...allRates);
                                        const range = maxRate - minRate || 1;
                                        const lo = minRate - range * 0.1;
                                        const hi = maxRate + range * 0.1;
                                        const span = hi - lo;
                                        const pctW = (v: number) => Math.max(2, ((v - lo) / span) * 100);

                                        const bars: { label: string; rate: number; color: string; bold?: boolean; tier?: string }[] = [
                                          { label: 'Our Rate', rate: g.finalRate, color: g.finalRate > g.compWeightedAvg ? C.warning : C.positive, bold: true },
                                          { label: 'Street', rate: g.streetRate, color: C.info },
                                          { label: 'Comp Avg', rate: g.compWeightedAvg, color: C.textMuted, bold: true },
                                          ...g.competitors.map(c => ({
                                            label: c.name, rate: c.rateForSize,
                                            color: qualityColor(c.tier), tier: c.tier,
                                          })),
                                        ];

                                        return bars.map((b, i) => (
                                          <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < bars.length - 1 ? 4 : 0,
                                          }}>
                                            <div style={{
                                              width: 90, fontSize: 11, color: b.bold ? C.textPrimary : C.textSecondary,
                                              fontWeight: b.bold ? 600 : 400, textAlign: 'right', flexShrink: 0,
                                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                              {b.tier && (
                                                <span style={{
                                                  display: 'inline-block', width: 14, height: 14, borderRadius: 3,
                                                  textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700,
                                                  color: '#fff', background: b.color, marginRight: 3, verticalAlign: 'middle',
                                                }}>{b.tier}</span>
                                              )}
                                              {b.label}
                                            </div>
                                            <div style={{ flex: 1, height: 14, background: C.bg, borderRadius: 3, position: 'relative' }}>
                                              <div style={{
                                                width: `${pctW(b.rate)}%`, height: '100%', borderRadius: 3,
                                                background: b.color, opacity: b.bold ? 0.9 : 0.5,
                                              }} />
                                            </div>
                                            <span style={{
                                              fontSize: 11, fontWeight: b.bold ? 700 : 500, color: b.bold ? C.textPrimary : C.textSecondary,
                                              width: 42, textAlign: 'right', flexShrink: 0,
                                            }}>
                                              ${b.rate}
                                            </span>
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Price History Timeline */}
                                <div style={{ marginBottom: 16 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>
                                    Price History
                                  </div>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 0,
                                    padding: '10px 14px', background: C.card, borderRadius: 8,
                                    border: `1px solid ${C.border}`, overflowX: 'auto',
                                  }}>
                                    {g.priceHistory.slice().reverse().map((pc, i, arr) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                                          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{pc.date}</div>
                                          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>${pc.previousRate}</div>
                                          <div style={{ fontSize: 9, color: C.textMuted }}>
                                            {pc.source === 'manual' ? 'Manual' : 'System'}
                                          </div>
                                        </div>
                                        <div style={{
                                          width: 32, height: 2, background: pc.change >= 0 ? C.positive : C.negative,
                                          margin: '0 4px', position: 'relative',
                                        }}>
                                          <span style={{
                                            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                                            fontSize: 9, fontWeight: 700,
                                            color: pc.change >= 0 ? C.positive : C.negative,
                                            whiteSpace: 'nowrap',
                                          }}>
                                            {pc.change >= 0 ? '+' : ''}${pc.change}
                                          </span>
                                        </div>
                                        {i === arr.length - 1 && (
                                          <div style={{ textAlign: 'center', minWidth: 60 }}>
                                            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Current</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>${g.streetRate}</div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {g.priceHistory.length === 0 && (
                                      <div style={{ textAlign: 'center', minWidth: 60 }}>
                                        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Current</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>${g.streetRate}</div>
                                      </div>
                                    )}
                                    {/* Pending change indicator */}
                                    {g.finalRate !== g.streetRate && (
                                      <>
                                        <div style={{
                                          width: 32, height: 2, margin: '0 4px',
                                          background: g.finalRate > g.streetRate ? C.positive : C.negative,
                                          borderStyle: 'dashed', borderWidth: '1px 0 0 0',
                                          borderColor: g.finalRate > g.streetRate ? C.positive : C.negative,
                                        }} />
                                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                                          <div style={{ fontSize: 10, color: C.warning, fontWeight: 600, marginBottom: 2 }}>Pending</div>
                                          <div style={{
                                            fontSize: 13, fontWeight: 700,
                                            color: g.finalRate > g.streetRate ? C.positive : C.negative,
                                          }}>
                                            ${g.finalRate}
                                          </div>
                                          <div style={{
                                            fontSize: 9, fontWeight: 700,
                                            color: g.finalRate > g.streetRate ? C.positive : C.negative,
                                          }}>
                                            {g.finalRate > g.streetRate ? '+' : ''}${g.finalRate - g.streetRate}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* DM Notes */}
                                <div style={{ marginTop: 16 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>
                                    Notes for DM Review
                                  </div>
                                  <textarea
                                    value={groupNotes[g.id] || ''}
                                    placeholder="Add context for DM review (e.g., why override, market conditions, tenant concerns)..."
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => {
                                      e.stopPropagation();
                                      const val = e.target.value;
                                      setGroupNotes(prev => ({ ...prev, [g.id]: val }));
                                    }}
                                    style={{
                                      width: '100%', minHeight: 56, padding: '8px 10px', borderRadius: 6,
                                      border: `1px solid ${C.border}`, fontSize: 12, outline: 'none',
                                      resize: 'vertical', fontFamily: 'inherit', color: C.textPrimary,
                                      background: C.card, boxSizing: 'border-box',
                                    }}
                                  />
                                  {groupNotes[g.id] && (
                                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                                      {groupNotes[g.id].length} characters — included in export
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  })}
              </table>
            </div>
            </>
            ) : (
            /* ── Non-Storage Leases Table ── */
            <div style={{ overflowX: 'auto' }}>
              {facilityNonStorage.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                  No non-storage leases at this facility
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {['Space', 'Tenant', 'Type', 'Rent/mo', 'Sq Ft', 'Lease Start', 'Lease End', 'Increases', 'Status', 'Notes'].map((h, i) => (
                        <th key={i} style={{
                          padding: '8px 10px', fontWeight: 600, color: C.textMuted, fontSize: 11,
                          textAlign: i === 3 || i === 4 ? 'right' : 'left', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {facilityNonStorage.map(ns => {
                      const statusColor = ns.status === 'Active' ? C.positive
                        : ns.status === 'Expiring Soon' ? C.warning : C.negative;
                      const statusBg = ns.status === 'Active' ? '#ECFDF5'
                        : ns.status === 'Expiring Soon' ? '#FFFBEB' : '#FEF2F2';
                      return (
                        <tr key={ns.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '8px 10px', fontWeight: 500 }}>{ns.spaceName}</td>
                          <td style={{ padding: '8px 10px', color: ns.tenantName === 'Vacant' ? C.textMuted : C.textPrimary }}>
                            {ns.tenantName}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                              color: ns.leaseType === 'Retail' ? '#7C3AED' : ns.leaseType === 'Office' ? C.info
                                : ns.leaseType === 'Warehouse' ? '#D97706' : C.textSecondary,
                              background: ns.leaseType === 'Retail' ? '#F5F3FF' : ns.leaseType === 'Office' ? '#EFF6FF'
                                : ns.leaseType === 'Warehouse' ? '#FFFBEB' : C.bg,
                            }}>
                              {ns.leaseType}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                            {ns.monthlyRent > 0 ? `$${ns.monthlyRent.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: C.textSecondary }}>
                            {ns.sqft > 0 ? `${ns.sqft.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: C.textSecondary }}>{ns.leaseStart || '—'}</td>
                          <td style={{ padding: '8px 10px', color: C.textSecondary }}>{ns.leaseEnd || '—'}</td>
                          <td style={{ padding: '8px 10px', color: C.textSecondary, fontSize: 11 }}>
                            {ns.scheduledIncreases.length > 0
                              ? ns.scheduledIncreases.map(si => `Yr${si.year}: ${si.pct}%`).join(', ')
                              : '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                              color: statusColor, background: statusBg,
                            }}>
                              {ns.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: C.textSecondary, fontSize: 11, maxWidth: 200 }}>
                            {ns.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary row */}
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${C.border}`, background: C.bg }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 11, color: C.textSecondary }} colSpan={3}>
                        Total: {facilityNonStorage.length} space{facilityNonStorage.length !== 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>
                        ${facilityNonStorage.reduce((s, ns) => s + ns.monthlyRent, 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: C.textSecondary }}>
                        {facilityNonStorage.reduce((s, ns) => s + ns.sqft, 0).toLocaleString()}
                      </td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
            )}
          </div>

          {/* ════ SECTION D: THIS WEEK'S CHANGES ════ */}
          {(() => {
            const changed = facilityGroups.filter(g => g.finalRate !== g.streetRate);
            if (changed.length === 0) return null;
            const aboveComp = changed.filter(g => g.compWeightedAvg > 0 && g.finalRate > g.compWeightedAvg);
            return (
              <div style={{
                padding: 16, background: C.card, borderRadius: 10,
                border: `1px solid ${C.border}`, marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 10 }}>
                  This Week's Changes ({changed.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {changed.map(g => {
                    const delta = g.finalRate - g.streetRate;
                    const isAboveComp = g.compWeightedAvg > 0 && g.finalRate > g.compWeightedAvg;
                    return (
                      <div key={g.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                        borderRadius: 6, background: appliedGroupIds.has(g.id) ? '#F0FDF4' : C.bg,
                        border: `1px solid ${appliedGroupIds.has(g.id) ? '#BBF7D0' : C.border}`,
                      }}>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>
                          {appliedGroupIds.has(g.id) && <span style={{ color: C.positive, marginRight: 4 }}>✓</span>}
                          {g.name}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>${g.streetRate}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>→</div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>${g.finalRate}</div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, minWidth: 40, textAlign: 'right',
                          color: delta > 0 ? C.positive : C.negative,
                        }}>
                          {delta > 0 ? '+' : ''}${delta}
                        </div>
                        {g.overrideRate !== null && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 9999, fontSize: 9, fontWeight: 600,
                            color: C.warning, background: `${C.warning}15`, border: `1px solid ${C.warning}30`,
                          }}>
                            {g.overrideReason || 'Override'}
                          </span>
                        )}
                        {isAboveComp && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 9999, fontSize: 9, fontWeight: 600,
                            color: C.negative, background: '#FEF2F2', border: '1px solid #FECACA',
                          }}>
                            Above comp
                          </span>
                        )}
                        {groupNotes[g.id] && (
                          <span title={groupNotes[g.id]} style={{
                            padding: '1px 6px', borderRadius: 9999, fontSize: 9, fontWeight: 600,
                            color: C.aiAccent, background: '#F5F3FF', border: `1px solid ${C.aiAccent}30`,
                          }}>
                            Note
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {aboveComp.length > 0 && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: C.negative }}>
                    {aboveComp.length} group{aboveComp.length !== 1 ? 's' : ''} priced above comp average — review before finalizing
                  </div>
                )}
              </div>
            );
          })()}

          {/* ════ SECTION E: PRICING HIERARCHY (collapsible) ════ */}
          <div style={{
            background: C.card, borderRadius: 10,
            border: `1px solid ${violations.length > 0 ? '#FECACA' : C.border}`, marginBottom: 16, overflow: 'hidden',
          }}>
            <div
              onClick={() => setHierarchyOpen(prev => !prev)}
              style={{
                padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: violations.length > 0 ? '#FEF2F2' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: C.textMuted }}>{hierarchyOpen ? '▼' : '▶'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                  Pricing Hierarchy
                </span>
                {violations.length > 0 ? (
                  <span style={{
                    padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                    color: C.negative, background: '#FEF2F2', border: '1px solid #FECACA',
                  }}>
                    {violations.length} violation{violations.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span style={{
                    padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                    color: C.positive, background: '#ECFDF5',
                  }}>
                    ✓ Valid
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                Ground → Interior → Drive-Up
              </span>
            </div>
            {hierarchyOpen && (
              <div style={{ padding: '8px 16px 16px' }}>
                {(() => {
                  const sizeGroups = new Map<string, VPUnitGroup[]>();
                  for (const g of facilityGroups) {
                    if (!sizeGroups.has(g.unitSize)) sizeGroups.set(g.unitSize, []);
                    sizeGroups.get(g.unitSize)!.push(g);
                  }
                  return Array.from(sizeGroups.entries()).map(([size, groups]) => {
                    if (groups.length < 2) return null;
                    const sorted = [...groups].sort((a, b) => a.hierarchyRank - b.hierarchyRank);
                    return (
                      <div key={size} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>{size}</div>
                        {sorted.map((g, i) => {
                          const hasViolation = violatedGroupIds.has(g.id);
                          return (
                            <div key={g.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                              background: hasViolation ? '#FEF2F2' : 'transparent', borderRadius: 4,
                            }}>
                              <span style={{ fontSize: 11, color: C.textMuted, width: 16 }}>{i + 1}.</span>
                              <span style={{ fontSize: 12, color: C.textPrimary, minWidth: 180 }}>{g.name}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>${g.finalRate}</span>
                              <span style={{ fontSize: 11, color: hasViolation ? C.negative : C.positive }}>
                                {hasViolation ? '⚠ Violation' : '✓'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* ════ SECTION F: ATTENTION ITEMS ════ */}
          {(() => {
            const items: { group: VPUnitGroup; reasons: string[] }[] = [];
            for (const g of facilityGroups) {
              if (appliedGroupIds.has(g.id)) continue;
              const reasons: string[] = [];
              if (g.occupancyPct < 75) reasons.push('Low occupancy');
              if (g.streetVsAchievedGap < -0.10) reasons.push(`Street ${(g.streetVsAchievedGap * 100).toFixed(0)}% below achieved`);
              if (g.compWeightedAvg > 0 && g.finalRate > g.compWeightedAvg) reasons.push('Final rate above comp avg');
              if (violatedGroupIds.has(g.id)) reasons.push('Hierarchy violation');
              if (g.activity.day14.net < -2) reasons.push('Declining activity');
              if (reasons.length > 0) items.push({ group: g, reasons });
            }
            if (items.length === 0) return null;
            return (
              <div style={{
                padding: 16, background: C.card, borderRadius: 10,
                border: `1px solid ${C.border}`, marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 10 }}>
                  Needs Attention ({items.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map(({ group: g, reasons }) => (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 6, background: '#FFFBEB', border: '1px solid #FDE68A',
                      cursor: 'pointer',
                    }} onClick={() => { setExpandedGroupId(g.id); setPricingSubTab('unit-groups'); }}>
                      <span style={{ fontSize: 14, color: C.warning }}>⚑</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: C.textSecondary }}>
                          {reasons.join(' · ')}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>${g.streetRate} → ${g.finalRate}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* ── DM Summary Modal ── */}
      {showDmSummary && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setShowDmSummary(false); setDmCopied(false); }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 600, maxHeight: '80vh', background: C.card, borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>DM Review Summary</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  Copy and paste into email for DM review
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(dmSummaryText);
                    setDmCopied(true);
                    setTimeout(() => setDmCopied(false), 2000);
                  }}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: dmCopied ? C.positive : C.aiAccent, color: '#fff',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  {dmCopied ? '✓ Copied' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={() => { setShowDmSummary(false); setDmCopied(false); }}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
                    background: C.card, color: C.textSecondary, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <pre style={{
                margin: 0, fontSize: 12, lineHeight: 1.6, color: C.textPrimary,
                fontFamily: "'SF Mono', 'Menlo', 'Monaco', monospace",
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {dmSummaryText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Confirmation Dialog ── */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowResetConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 400, padding: 24, background: C.card, borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
              Reset Session?
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20, lineHeight: 1.6 }}>
              This will clear all overrides, notes, applied states, and facility notes for every facility.
              This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: C.card, color: C.textSecondary, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetSession}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none',
                  background: C.negative, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Override Modal ── */}
      {showBatchOverride && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setShowBatchOverride(false); setBatchPct(''); }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 420, padding: 24, background: C.card, borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              Batch % Adjustment
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
              Apply a percentage change to {selectedGroupIds.size} selected unit group{selectedGroupIds.size !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {[-10, -5, 5, 10].map(p => (
                <button
                  key={p}
                  onClick={() => setBatchPct(String(p))}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: batchPct === String(p) ? `2px solid ${p > 0 ? C.positive : C.negative}` : `1px solid ${C.border}`,
                    background: batchPct === String(p) ? (p > 0 ? '#F0FDF4' : '#FEF2F2') : C.card,
                    color: p > 0 ? C.positive : C.negative, cursor: 'pointer',
                  }}
                >
                  {p > 0 ? '+' : ''}{p}%
                </button>
              ))}
              <span style={{ color: C.textMuted, fontSize: 12 }}>or</span>
              <input
                type="number"
                value={batchPct}
                onChange={e => setBatchPct(e.target.value)}
                placeholder="Custom %"
                style={{
                  width: 80, padding: '6px 10px', borderRadius: 6,
                  border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
                }}
              />
            </div>
            {batchPct && !isNaN(parseFloat(batchPct)) && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, background: C.bg,
                border: `1px solid ${C.border}`, marginBottom: 16, fontSize: 12,
              }}>
                <div style={{ fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>Preview</div>
                {Array.from(selectedGroupIds).slice(0, 5).map(id => {
                  const g = unitGroups.find(ug => ug.id === id);
                  if (!g) return null;
                  const newRate = Math.round(g.streetRate * (1 + parseFloat(batchPct) / 100));
                  const delta = newRate - g.streetRate;
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: C.textSecondary }}>
                      <span>{g.name}</span>
                      <span>
                        ${g.streetRate} → <strong style={{ color: delta >= 0 ? C.positive : C.negative }}>${newRate}</strong>
                        <span style={{ color: delta >= 0 ? C.positive : C.negative, marginLeft: 4 }}>
                          ({delta >= 0 ? '+' : ''}${delta})
                        </span>
                      </span>
                    </div>
                  );
                })}
                {selectedGroupIds.size > 5 && (
                  <div style={{ color: C.textMuted, marginTop: 4 }}>...and {selectedGroupIds.size - 5} more</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowBatchOverride(false); setBatchPct(''); }}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: C.card, color: C.textSecondary, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchOverride}
                disabled={!batchPct || isNaN(parseFloat(batchPct))}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none',
                  background: batchPct && !isNaN(parseFloat(batchPct)) ? C.positive : C.textMuted,
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: batchPct && !isNaN(parseFloat(batchPct)) ? 'pointer' : 'default',
                  opacity: batchPct && !isNaN(parseFloat(batchPct)) ? 1 : 0.5,
                }}
              >
                Apply to {selectedGroupIds.size} Groups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard Hints ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 320, right: 0, padding: '6px 24px',
        background: C.activeNav, display: 'flex', gap: 16, alignItems: 'center',
        fontSize: 10, color: '#94A3B8', zIndex: 999,
      }}>
        <span><kbd style={{ padding: '1px 5px', borderRadius: 3, background: '#334155', color: '#CBD5E1', fontSize: 9, fontFamily: 'monospace' }}>↑↓</kbd> Navigate</span>
        <span><kbd style={{ padding: '1px 5px', borderRadius: 3, background: '#334155', color: '#CBD5E1', fontSize: 9, fontFamily: 'monospace' }}>A</kbd> Apply/Undo</span>
        <span><kbd style={{ padding: '1px 5px', borderRadius: 3, background: '#334155', color: '#CBD5E1', fontSize: 9, fontFamily: 'monospace' }}>Space</kbd> Select</span>
        <span><kbd style={{ padding: '1px 5px', borderRadius: 3, background: '#334155', color: '#CBD5E1', fontSize: 9, fontFamily: 'monospace' }}>Esc</kbd> Collapse</span>
      </div>

      {/* ── Export Toast ── */}
      {showExportToast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 24, padding: '12px 20px',
          borderRadius: 8, background: C.activeNav, color: '#fff',
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: C.positive }}>✓</span> CSV exported successfully
        </div>
      )}
    </>
  );
}
