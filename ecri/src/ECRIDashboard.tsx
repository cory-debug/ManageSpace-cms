import { useState, useMemo } from 'react';
import { type ECRITenant, type Competitor, buildTenant, OVERRIDE_REASONS } from './ecri-engine';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  fund: string;
  totalUnits: number;
  vacantUnits: number;
}

type FilterTab = 'all' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'reviewed' | 'skipped';

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
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

const tierColor = (tier: 1 | 2 | 3 | 4) =>
  tier === 1 ? C.negative : tier === 2 ? C.positive : tier === 3 ? C.warning : C.info;

const tierLabel = (tier: 1 | 2 | 3 | 4) =>
  tier === 1 ? 'Tier 1 (40%)' : tier === 2 ? 'Tier 2 (10%)' : tier === 3 ? 'Tier 3 (15%)' : 'Tier 4 (20%)';

const qualityColor = (q: 'A' | 'B' | 'C' | 'D') =>
  q === 'A' ? C.positive : q === 'B' ? C.info : q === 'C' ? C.warning : C.negative;

// OVERRIDE_REASONS and business logic imported from ./ecri-engine

const FlagBadge = ({ label, color }: { label: string; color: string }) => (
  <span style={{
    padding: '1px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
    color, background: `${color}15`, border: `1px solid ${color}30`,
  }}>
    {label}
  </span>
);

// ═══════════════════════════════════════════════════════
// MOCK DATA — Morningstar-realistic
// ═══════════════════════════════════════════════════════

const FACILITIES: Facility[] = [
  { id: 'f1', name: 'Cornelius', city: 'Cornelius', state: 'NC', fund: 'Fund I', totalUnits: 350, vacantUnits: 38 },
  { id: 'f2', name: 'Fort Lauderdale Central', city: 'Fort Lauderdale', state: 'FL', fund: 'Fund II', totalUnits: 400, vacantUnits: 48 },
  { id: 'f3', name: 'Athens West', city: 'Athens', state: 'GA', fund: 'Fund I', totalUnits: 402, vacantUnits: 42 },
];

const MOCK_TENANTS: ECRITenant[] = [
  // ═══ CORNELIUS (f1) ═══

  // Unit Group: 10×10 Climate, First Floor — Median $154, Street $134, Occ 90%
  buildTenant({
    id: 't1', facilityId: 'f1', customerName: 'Sarah Mitchell', unitNumber: '105',
    unitType: '10×10 CC', unitGroup: '10×10 Climate, First Floor', features: 'CC · FF',
    tenureMonths: 27, currentRent: 184, streetRate: 134, unitGroupMedian: 154,
    unitGroupOccupancy: 0.90, unitGroupTotal: 50, unitGroupOccupied: 45,
    competitors: [
      { name: 'Life Storage', quality: 'B', unitType: '10×10', features: 'CC', distance: 2.3, rate: 147, weight: 40, lastSeen: 'Jan 24' },
      { name: 'CubeSmart', quality: 'A', unitType: '10×10', features: 'CC', distance: 1.8, rate: 165, weight: 35, lastSeen: 'Jan 20' },
      { name: 'SecureSpace', quality: 'C', unitType: '10×10', features: 'CC', distance: 3.4, rate: 123, weight: 25, lastSeen: 'Jan 26' },
    ],
    previousIncreases: [{ date: 'Mar 2025', amount: 15 }], isFirstECRI: false,
  }),
  buildTenant({
    id: 't2', facilityId: 'f1', customerName: 'James Ward', unitNumber: '108',
    unitType: '10×10 CC', unitGroup: '10×10 Climate, First Floor', features: 'CC · FF',
    tenureMonths: 36, currentRent: 253, streetRate: 134, unitGroupMedian: 154,
    unitGroupOccupancy: 0.90, unitGroupTotal: 50, unitGroupOccupied: 45,
    previousIncreases: [{ date: 'Mar 2024', amount: 20 }, { date: 'Mar 2025', amount: 15 }], isFirstECRI: false,
  }),
  buildTenant({
    id: 't3', facilityId: 'f1', customerName: 'Rebecca Torres', unitNumber: '112',
    unitType: '10×10 CC', unitGroup: '10×10 Climate, First Floor', features: 'CC',
    tenureMonths: 12, currentRent: 99, streetRate: 134, unitGroupMedian: 154,
    unitGroupOccupancy: 0.90, unitGroupTotal: 50, unitGroupOccupied: 45,
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't4', facilityId: 'f1', customerName: 'Daniel Kim', unitNumber: '115',
    unitType: '10×10 CC', unitGroup: '10×10 Climate, First Floor', features: 'CC · FF',
    tenureMonths: 48, currentRent: 165, streetRate: 134, unitGroupMedian: 154,
    unitGroupOccupancy: 0.90, unitGroupTotal: 50, unitGroupOccupied: 45,
    previousIncreases: [{ date: 'Mar 2025', amount: 12 }], isFirstECRI: false,
  }),

  buildTenant({
    id: 't25', facilityId: 'f1', customerName: 'Angela Price', unitNumber: '118',
    unitType: '10×10 CC', unitGroup: '10×10 Climate, First Floor', features: 'CC',
    tenureMonths: 11, currentRent: 69, streetRate: 134, unitGroupMedian: 154,
    unitGroupOccupancy: 0.90, unitGroupTotal: 50, unitGroupOccupied: 45,
    isFirstECRI: true,
  }),

  // Unit Group: 10×20 Climate, Drive-Up — Median $222, Street $199, Occ 84%
  buildTenant({
    id: 't5', facilityId: 'f1', customerName: 'Michael Chen', unitNumber: '315',
    unitType: '10×20 CC', unitGroup: '10×20 Climate, Drive-Up', features: 'CC · DU',
    tenureMonths: 42, currentRent: 178, streetRate: 199, unitGroupMedian: 222,
    unitGroupOccupancy: 0.84, unitGroupTotal: 50, unitGroupOccupied: 42,
    competitors: [
      { name: 'Life Storage', quality: 'B', unitType: '10×20', features: 'CC', distance: 2.3, rate: 295, weight: 40, lastSeen: 'Jan 24' },
      { name: 'CubeSmart', quality: 'A', unitType: '10×20', features: 'CC', distance: 1.8, rate: 310, weight: 35, lastSeen: 'Jan 20' },
    ],
    previousIncreases: [{ date: 'Mar 2025', amount: 18 }], isFirstECRI: false,
  }),
  buildTenant({
    id: 't6', facilityId: 'f1', customerName: 'Patricia Nguyen', unitNumber: '320',
    unitType: '10×20 CC', unitGroup: '10×20 Climate, Drive-Up', features: 'CC · DU',
    tenureMonths: 30, currentRent: 222, streetRate: 199, unitGroupMedian: 222,
    unitGroupOccupancy: 0.84, unitGroupTotal: 50, unitGroupOccupied: 42,
  }),
  buildTenant({
    id: 't7', facilityId: 'f1', customerName: 'Robert Martinez', unitNumber: '325',
    unitType: '10×20 CC', unitGroup: '10×20 Climate, Drive-Up', features: 'CC · DU',
    tenureMonths: 55, currentRent: 306, streetRate: 199, unitGroupMedian: 222,
    unitGroupOccupancy: 0.84, unitGroupTotal: 50, unitGroupOccupied: 42,
    previousIncreases: [{ date: 'Mar 2024', amount: 20 }, { date: 'Mar 2025', amount: 25 }], isFirstECRI: false,
  }),

  // Unit Group: 5×10 Non-Climate — Median $84, Street $89, Occ 89%
  buildTenant({
    id: 't8', facilityId: 'f1', customerName: 'Lisa Park', unitNumber: '201',
    unitType: '5×10 NCC', unitGroup: '5×10 Non-Climate', features: 'NCC',
    tenureMonths: 11, currentRent: 49, streetRate: 89, unitGroupMedian: 84,
    unitGroupOccupancy: 0.89, unitGroupTotal: 36, unitGroupOccupied: 32,
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't9', facilityId: 'f1', customerName: 'Tommy Rogers', unitNumber: '205',
    unitType: '5×10 NCC', unitGroup: '5×10 Non-Climate', features: 'NCC',
    tenureMonths: 24, currentRent: 168, streetRate: 89, unitGroupMedian: 84,
    unitGroupOccupancy: 0.89, unitGroupTotal: 36, unitGroupOccupied: 32,
    previousIncreases: [{ date: 'Mar 2025', amount: 10 }], isFirstECRI: false,
  }),

  // Unit Group: 10×30 Climate, Drive-Up — Median $290, Street $259, Occ 69%
  buildTenant({
    id: 't10', facilityId: 'f1', customerName: 'David Kim', unitNumber: '501',
    unitType: '10×30 CC', unitGroup: '10×30 Climate, Drive-Up', features: 'CC · DU · FF',
    tenureMonths: 83, currentRent: 359, streetRate: 259, unitGroupMedian: 290,
    unitGroupOccupancy: 0.69, unitGroupTotal: 26, unitGroupOccupied: 18,
    isFirstECRI: false, previousIncreases: [{ date: 'Mar 2025', amount: 25 }],
  }),
  buildTenant({
    id: 't11', facilityId: 'f1', customerName: 'Karen White', unitNumber: '505',
    unitType: '10×30 CC', unitGroup: '10×30 Climate, Drive-Up', features: 'CC · DU',
    tenureMonths: 34, currentRent: 476, streetRate: 259, unitGroupMedian: 290,
    unitGroupOccupancy: 0.69, unitGroupTotal: 26, unitGroupOccupied: 18,
    isMultiUnit: true, isFirstECRI: false,
    previousIncreases: [{ date: 'Mar 2024', amount: 30 }],
  }),

  // ═══ FORT LAUDERDALE (f2) ═══

  // Unit Group: 10×10 Non-Climate — Median $145, Street $155, Occ 90%
  buildTenant({
    id: 't12', facilityId: 'f2', customerName: 'Charles Lee', unitNumber: '210',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC',
    tenureMonths: 36, currentRent: 120, streetRate: 155, unitGroupMedian: 145,
    unitGroupOccupancy: 0.90, unitGroupTotal: 42, unitGroupOccupied: 38,
    competitors: [
      { name: 'Public Storage', quality: 'B', unitType: '10×10', features: 'NCC', distance: 2.1, rate: 162, weight: 40, lastSeen: 'Jan 18' },
      { name: 'CubeSmart', quality: 'A', unitType: '10×10', features: 'NCC', distance: 1.8, rate: 185, weight: 35, lastSeen: 'Jan 20' },
      { name: 'Life Storage', quality: 'B', unitType: '10×10', features: 'NCC', distance: 2.3, rate: 155, weight: 25, lastSeen: 'Jan 24' },
    ],
    previousIncreases: [{ date: 'Mar 2025', amount: 10 }], isFirstECRI: false,
  }),
  buildTenant({
    id: 't13', facilityId: 'f2', customerName: 'Maria Garcia', unitNumber: '215',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC',
    tenureMonths: 14, currentRent: 135, streetRate: 155, unitGroupMedian: 145,
    unitGroupOccupancy: 0.90, unitGroupTotal: 42, unitGroupOccupied: 38,
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't14', facilityId: 'f2', customerName: 'Susan Williams', unitNumber: '220',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC',
    tenureMonths: 55, currentRent: 110, streetRate: 155, unitGroupMedian: 145,
    unitGroupOccupancy: 0.90, unitGroupTotal: 42, unitGroupOccupied: 38,
    previousIncreases: [{ date: 'Jun 2024', amount: 10 }, { date: 'Mar 2025', amount: 10 }], isFirstECRI: false,
  }),
  buildTenant({
    id: 't15', facilityId: 'f2', customerName: 'Jennifer Brown', unitNumber: '225',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC · DU',
    tenureMonths: 24, currentRent: 155, streetRate: 155, unitGroupMedian: 145,
    unitGroupOccupancy: 0.90, unitGroupTotal: 42, unitGroupOccupied: 38,
  }),

  // Unit Group: 5×10 Climate — Median $105, Street $119, Occ 93%
  buildTenant({
    id: 't16', facilityId: 'f2', customerName: 'James Thompson', unitNumber: '105',
    unitType: '5×10 CC', unitGroup: '5×10 Climate', features: 'CC · FF',
    tenureMonths: 30, currentRent: 81, streetRate: 119, unitGroupMedian: 105,
    unitGroupOccupancy: 0.93, unitGroupTotal: 30, unitGroupOccupied: 28,
    isFirstECRI: true,
    competitors: [
      { name: 'Life Storage', quality: 'B', unitType: '5×10', features: 'CC', distance: 2.3, rate: 147, weight: 50, lastSeen: 'Jan 24' },
      { name: 'StorageMart', quality: 'B', unitType: '5×10', features: 'CC', distance: 3.7, rate: 107, weight: 25, lastSeen: 'Jan 6' },
      { name: 'SecureSpace', quality: 'C', unitType: '5×10', features: 'CC', distance: 3.4, rate: 123, weight: 25, lastSeen: 'Jan 26' },
    ],
  }),
  buildTenant({
    id: 't17', facilityId: 'f2', customerName: 'Ashley Wilson', unitNumber: '108',
    unitType: '5×10 CC', unitGroup: '5×10 Climate', features: 'CC',
    tenureMonths: 15, currentRent: 85, streetRate: 119, unitGroupMedian: 105,
    unitGroupOccupancy: 0.93, unitGroupTotal: 30, unitGroupOccupied: 28,
    isFirstECRI: true,
  }),

  // Unit Group: 10×20 Non-Climate, Drive-Up — Median $200, Street $215, Occ 83%
  buildTenant({
    id: 't18', facilityId: 'f2', customerName: 'Kevin Wright', unitNumber: '405',
    unitType: '10×20 NCC', unitGroup: '10×20 Non-Climate, Drive-Up', features: 'NCC · DU',
    tenureMonths: 18, currentRent: 175, streetRate: 215, unitGroupMedian: 200,
    unitGroupOccupancy: 0.83, unitGroupTotal: 24, unitGroupOccupied: 20,
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't19', facilityId: 'f2', customerName: 'Amanda Davis', unitNumber: '410',
    unitType: '10×20 NCC', unitGroup: '10×20 Non-Climate, Drive-Up', features: 'NCC · DU',
    tenureMonths: 40, currentRent: 190, streetRate: 215, unitGroupMedian: 200,
    unitGroupOccupancy: 0.83, unitGroupTotal: 24, unitGroupOccupied: 20,
    isFirstECRI: false, previousIncreases: [{ date: 'Mar 2025', amount: 15 }],
  }),

  // ═══ ATHENS WEST (f3) ═══

  // Unit Group: 10×10 Non-Climate — Median $125, Street $125, Occ 90%
  buildTenant({
    id: 't20', facilityId: 'f3', customerName: 'Ryan Cooper', unitNumber: '201',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC',
    tenureMonths: 32, currentRent: 110, streetRate: 125, unitGroupMedian: 125,
    unitGroupOccupancy: 0.90, unitGroupTotal: 40, unitGroupOccupied: 36,
    competitors: [
      { name: 'StorageMax', quality: 'B', unitType: '10×10', features: 'NCC', distance: 1.5, rate: 138, weight: 40, lastSeen: 'Jan 15' },
      { name: 'Life Storage', quality: 'B', unitType: '10×10', features: 'NCC', distance: 2.8, rate: 145, weight: 35, lastSeen: 'Jan 22' },
      { name: 'Public Storage', quality: 'B', unitType: '10×10', features: 'NCC', distance: 3.2, rate: 132, weight: 25, lastSeen: 'Jan 18' },
    ],
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't21', facilityId: 'f3', customerName: 'Emily Sanders', unitNumber: '205',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC',
    tenureMonths: 15, currentRent: 95, streetRate: 125, unitGroupMedian: 125,
    unitGroupOccupancy: 0.90, unitGroupTotal: 40, unitGroupOccupied: 36,
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't22', facilityId: 'f3', customerName: 'Brian Foster', unitNumber: '210',
    unitType: '10×10 NCC', unitGroup: '10×10 Non-Climate', features: 'NCC · DU',
    tenureMonths: 48, currentRent: 135, streetRate: 125, unitGroupMedian: 125,
    unitGroupOccupancy: 0.90, unitGroupTotal: 40, unitGroupOccupied: 36,
    previousIncreases: [{ date: 'Mar 2024', amount: 8 }, { date: 'Mar 2025', amount: 10 }], isFirstECRI: false,
  }),

  // Unit Group: 10×20 Climate, Drive-Up — Median $210, Street $215, Occ 71%
  buildTenant({
    id: 't23', facilityId: 'f3', customerName: 'Nicole Adams', unitNumber: '308',
    unitType: '10×20 CC', unitGroup: '10×20 Climate, Drive-Up', features: 'CC · DU',
    tenureMonths: 22, currentRent: 190, streetRate: 215, unitGroupMedian: 210,
    unitGroupOccupancy: 0.71, unitGroupTotal: 28, unitGroupOccupied: 20,
    isFirstECRI: true,
  }),
  buildTenant({
    id: 't24', facilityId: 'f3', customerName: 'Mark Phillips', unitNumber: '312',
    unitType: '10×20 CC', unitGroup: '10×20 Climate, Drive-Up', features: 'CC · DU',
    tenureMonths: 60, currentRent: 240, streetRate: 215, unitGroupMedian: 210,
    unitGroupOccupancy: 0.71, unitGroupTotal: 28, unitGroupOccupied: 20,
    isMultiUnit: true, isFirstECRI: false,
    previousIncreases: [{ date: 'Mar 2025', amount: 20 }],
  }),
];

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function ECRIDashboard() {
  // ── State ──
  const [selectedFacilityId, setSelectedFacilityId] = useState('f1');
  const [activeMainTab, setActiveMainTab] = useState<'ecri' | 'vacant' | 'pricing'>('ecri');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');
  const [tenants, setTenants] = useState<ECRITenant[]>(MOCK_TENANTS);
  const [facilitySearch, setFacilitySearch] = useState('');
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [undoAvailable, setUndoAvailable] = useState<Set<string>>(new Set());
  const [hoveredFacilityId, setHoveredFacilityId] = useState<string | null>(null);
  const [modifyingTenantId, setModifyingTenantId] = useState<string | null>(null);
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyReason, setModifyReason] = useState('');

  // ── Computed Values ──
  const selectedFacility = FACILITIES.find(f => f.id === selectedFacilityId) || FACILITIES[0];

  const facilityStats = useMemo(() => {
    const stats: Record<string, {
      ecriCount: number; potentialRevenue: number; reviewedCount: number;
      tier1Count: number; tier2Count: number; tier3Count: number; tier4Count: number;
      pendingCount: number; flagCount: number;
    }> = {};
    for (const f of FACILITIES) {
      const ft = tenants.filter(t => t.facilityId === f.id);
      stats[f.id] = {
        ecriCount: ft.length,
        potentialRevenue: ft.reduce((sum, t) => {
          if (t.status === 'skipped') return sum;
          const amt = t.status === 'approved' || t.status === 'modified'
            ? (t.approvedAmount || t.recommendedNewRent) : t.recommendedNewRent;
          return sum + (amt - t.currentRent);
        }, 0),
        reviewedCount: ft.filter(t => t.status !== 'pending').length,
        tier1Count: ft.filter(t => t.assignedTier === 1).length,
        tier2Count: ft.filter(t => t.assignedTier === 2).length,
        tier3Count: ft.filter(t => t.assignedTier === 3).length,
        tier4Count: ft.filter(t => t.assignedTier === 4).length,
        pendingCount: ft.filter(t => t.status === 'pending').length,
        flagCount: ft.filter(t => t.isAboveStreet || t.isSeasonalLowRate || t.isMultiUnit || t.isLeaseUp).length,
      };
    }
    return stats;
  }, [tenants]);

  const totalPending = useMemo(() => tenants.filter(t => t.status === 'pending').length, [tenants]);

  const filteredFacilities = useMemo(() => {
    const sorted = [...FACILITIES].sort((a, b) =>
      (facilityStats[b.id]?.potentialRevenue || 0) - (facilityStats[a.id]?.potentialRevenue || 0),
    );
    if (!facilitySearch.trim()) return sorted;
    const s = facilitySearch.toLowerCase();
    return sorted.filter(f =>
      f.name.toLowerCase().includes(s) || f.city.toLowerCase().includes(s) || f.state.toLowerCase().includes(s),
    );
  }, [facilitySearch, facilityStats]);

  const facilityTenants = useMemo(() =>
    tenants.filter(t => t.facilityId === selectedFacilityId),
    [tenants, selectedFacilityId],
  );

  const filteredTenants = useMemo((): ECRITenant[] => {
    switch (activeFilterTab) {
      case 'all': return facilityTenants;
      case 'tier1': return facilityTenants.filter(t => t.assignedTier === 1);
      case 'tier2': return facilityTenants.filter(t => t.assignedTier === 2);
      case 'tier3': return facilityTenants.filter(t => t.assignedTier === 3);
      case 'tier4': return facilityTenants.filter(t => t.assignedTier === 4);
      case 'reviewed': return facilityTenants.filter(t => t.status === 'approved' || t.status === 'modified');
      case 'skipped': return facilityTenants.filter(t => t.status === 'skipped');
      default: return facilityTenants;
    }
  }, [facilityTenants, activeFilterTab]);

  const tabCounts = useMemo(() => ({
    all: facilityTenants.length,
    tier1: facilityTenants.filter(t => t.assignedTier === 1).length,
    tier2: facilityTenants.filter(t => t.assignedTier === 2).length,
    tier3: facilityTenants.filter(t => t.assignedTier === 3).length,
    tier4: facilityTenants.filter(t => t.assignedTier === 4).length,
    reviewed: facilityTenants.filter(t => t.status === 'approved' || t.status === 'modified').length,
    skipped: facilityTenants.filter(t => t.status === 'skipped').length,
  }), [facilityTenants]);

  const groupedTenants = useMemo(() => {
    const groupMap = new Map<string, ECRITenant[]>();
    for (const t of filteredTenants) {
      if (!groupMap.has(t.unitGroup)) groupMap.set(t.unitGroup, []);
      groupMap.get(t.unitGroup)!.push(t);
    }
    return Array.from(groupMap.entries()).map(([key, tList]) => {
      const first = tList[0];
      return {
        key,
        unitGroup: key,
        tenants: tList,
        occupancy: first.unitGroupOccupancy,
        occupancyTotal: first.unitGroupTotal,
        occupancyOccupied: first.unitGroupOccupied,
        median: first.unitGroupMedian,
        streetRate: first.streetRate,
      };
    });
  }, [filteredTenants]);

  const currentStats = facilityStats[selectedFacilityId] || {
    ecriCount: 0, potentialRevenue: 0, reviewedCount: 0,
    tier1Count: 0, tier2Count: 0, tier3Count: 0, tier4Count: 0, pendingCount: 0, flagCount: 0,
  };

  // ── Handlers ──
  const handleSelectFacility = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    setActiveFilterTab('all');
    setExpandedTenantId(null);
    setModifyingTenantId(null);
  };

  const handleApprove = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, status: 'approved' as const, approvedAmount: t.recommendedNewRent } : t,
    ));
    setUndoAvailable(prev => { const n = new Set(prev); n.add(tenantId); return n; });
    setTimeout(() => {
      setUndoAvailable(prev => { const n = new Set(prev); n.delete(tenantId); return n; });
    }, 10000);
    if (expandedTenantId === tenantId) setExpandedTenantId(null);
  };

  const handleModify = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    const newAmount = parseFloat(modifyAmount);
    if (isNaN(newAmount) || newAmount <= tenant.currentRent || !modifyReason) return;
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, status: 'modified' as const, approvedAmount: Math.round(newAmount), overrideReason: modifyReason } : t,
    ));
    setModifyingTenantId(null);
    setModifyAmount('');
    setModifyReason('');
    setUndoAvailable(prev => { const n = new Set(prev); n.add(tenantId); return n; });
    setTimeout(() => {
      setUndoAvailable(prev => { const n = new Set(prev); n.delete(tenantId); return n; });
    }, 10000);
    if (expandedTenantId === tenantId) setExpandedTenantId(null);
  };

  const handleSkip = (tenantId: string) => {
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, status: 'skipped' as const } : t,
    ));
    if (expandedTenantId === tenantId) setExpandedTenantId(null);
  };

  const handleUndo = (tenantId: string) => {
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, status: 'pending' as const, approvedAmount: undefined, overrideReason: undefined } : t,
    ));
    setUndoAvailable(prev => { const n = new Set(prev); n.delete(tenantId); return n; });
  };

  const handleBulkApprove = (tier?: 1 | 2 | 3 | 4, groupKey?: string) => {
    const targets = groupKey
      ? facilityTenants.filter(t => t.unitGroup === groupKey && t.status === 'pending')
      : tier !== undefined
        ? facilityTenants.filter(t => t.assignedTier === tier && t.status === 'pending')
        : [];
    if (targets.length === 0) return;
    const ids = targets.map(t => t.id);
    setTenants(prev => prev.map(t =>
      ids.includes(t.id) ? { ...t, status: 'approved' as const, approvedAmount: t.recommendedNewRent } : t,
    ));
    setUndoAvailable(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    setTimeout(() => {
      setUndoAvailable(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    }, 10000);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const toggleExpand = (tenantId: string) => {
    setExpandedTenantId(prev => prev === tenantId ? null : tenantId);
    if (modifyingTenantId && modifyingTenantId !== tenantId) {
      setModifyingTenantId(null);
      setModifyAmount('');
      setModifyReason('');
    }
  };

  // ── Render Helpers ──
  const renderFilterTab = (tab: FilterTab, label: string, count: number) => {
    const active = activeFilterTab === tab;
    return (
      <button
        key={tab}
        onClick={() => setActiveFilterTab(tab)}
        style={{
          padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          border: active ? 'none' : `1px solid ${C.border}`,
          background: active ? C.activeNav : C.card,
          color: active ? '#fff' : C.textSecondary,
        }}
      >
        {label} {count > 0 ? count : ''}
      </button>
    );
  };

  const groupPotentialRevenue = (group: { tenants: ECRITenant[] }) =>
    group.tenants.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.recommendedIncrease, 0);

  const groupPendingCount = (group: { tenants: ECRITenant[] }) =>
    group.tenants.filter(t => t.status === 'pending').length;

  // ── Render ──
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* ════════ HEADER ════════ */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
        background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 6, background: C.activeNav,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16, fontWeight: 700,
        }}>M</div>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginRight: 32 }}>
          ManageSpace Revenue
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['ecri', 'vacant', 'pricing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: activeMainTab === tab ? 'none' : `1px solid ${C.border}`,
                background: activeMainTab === tab ? C.activeNav : 'transparent',
                color: activeMainTab === tab ? '#fff' : C.textSecondary,
              }}
            >
              {tab === 'ecri' ? 'ECRI' : tab === 'vacant' ? 'Vacant Pricing' : 'Pricing Model'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: C.textMuted }}>April 2026 Batch</span>
        <div style={{
          width: 32, height: 32, borderRadius: 16, background: C.aiAccent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 700,
        }}>CS</div>
      </header>

      {/* ════════ MAIN CONTENT ════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ════════ LEFT PANEL — FACILITY SELECTOR ════════ */}
        <div style={{
          width: 320, display: 'flex', flexDirection: 'column',
          background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted }}>
                Facilities
              </span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary }}>{totalPending}</span>
                <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>pending</span>
              </div>
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
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredFacilities.map(facility => {
              const stats = facilityStats[facility.id];
              const isSelected = facility.id === selectedFacilityId;
              const isHovered = hoveredFacilityId === facility.id;
              const progress = stats && stats.ecriCount > 0
                ? Math.round((stats.reviewedCount / stats.ecriCount) * 100) : 0;
              return (
                <div
                  key={facility.id}
                  onClick={() => handleSelectFacility(facility.id)}
                  onMouseEnter={() => setHoveredFacilityId(facility.id)}
                  onMouseLeave={() => setHoveredFacilityId(null)}
                  style={{
                    padding: '12px 14px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                    background: isSelected ? C.card : isHovered ? C.hover : 'transparent',
                    borderLeft: isSelected ? `3px solid ${C.activeNav}` : '3px solid transparent',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{facility.name}</div>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{facility.fund}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>{facility.city}, {facility.state}</div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                    {stats?.ecriCount || 0} ECRIs · <span style={{ color: C.positive, fontWeight: 600 }}>+${stats?.potentialRevenue || 0}/mo</span>
                    {(stats?.flagCount || 0) > 0 && (
                      <span style={{ color: C.warning, marginLeft: 8 }}>⚑ {stats?.flagCount} flags</span>
                    )}
                  </div>
                  {/* Tier distribution mini-bar */}
                  {stats && stats.ecriCount > 0 && (
                    <div style={{ display: 'flex', gap: 1, marginTop: 6, height: 4, borderRadius: 2, overflow: 'hidden' }}>
                      {stats.tier1Count > 0 && <div style={{ flex: stats.tier1Count, background: C.negative }} />}
                      {stats.tier2Count > 0 && <div style={{ flex: stats.tier2Count, background: C.positive }} />}
                      {stats.tier3Count > 0 && <div style={{ flex: stats.tier3Count, background: C.warning }} />}
                      {stats.tier4Count > 0 && <div style={{ flex: stats.tier4Count, background: C.info }} />}
                    </div>
                  )}
                  {stats && stats.ecriCount > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#E2E8F0' }}>
                        <div style={{
                          width: `${progress}%`, height: '100%', borderRadius: 2,
                          background: C.positive, transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {stats.reviewedCount}/{stats.ecriCount} reviewed
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
          {activeMainTab !== 'ecri' ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 16 }}>
              {activeMainTab === 'vacant' ? 'Vacant Pricing — Coming Soon' : 'Pricing Model — Coming Soon'}
            </div>
          ) : (
            <>
              {/* ── Summary Bar ── */}
              <div style={{
                padding: '16px 24px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                      {selectedFacility.name}
                    </h1>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      Existing Customer Rate Increase recommendations — April 2026 batch
                    </div>
                    <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                      {selectedFacility.city}, {selectedFacility.state} · {selectedFacility.fund} · {currentStats.ecriCount} ECRIs · <span style={{ color: C.positive, fontWeight: 600 }}>+${currentStats.potentialRevenue}/mo potential</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
                      {currentStats.tier1Count > 0 && (
                        <span><span style={{ color: C.negative }}>●</span> {currentStats.tier1Count} Tier 1 (40%)</span>
                      )}
                      {currentStats.tier2Count > 0 && (
                        <span><span style={{ color: C.positive }}>●</span> {currentStats.tier2Count} Tier 2 (10%)</span>
                      )}
                      {currentStats.tier3Count > 0 && (
                        <span><span style={{ color: C.warning }}>●</span> {currentStats.tier3Count} Tier 3 (15%)</span>
                      )}
                      {currentStats.tier4Count > 0 && (
                        <span><span style={{ color: C.info }}>●</span> {currentStats.tier4Count} Tier 4 (20%)</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {currentStats.pendingCount > 0 && (
                      <button
                        onClick={() => handleBulkApprove(4)}
                        style={{
                          padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: C.positive, color: '#fff', fontSize: 13, fontWeight: 600,
                        }}
                      >
                        Approve All Tier 4 (20%)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Filter Tabs ── */}
              <div style={{
                padding: '10px 24px', display: 'flex', gap: 6, flexShrink: 0,
                background: C.card, borderBottom: `1px solid ${C.border}`,
                flexWrap: 'wrap',
              }}>
                {renderFilterTab('all', 'All', tabCounts.all)}
                {renderFilterTab('tier1', 'Tier 1 (40%)', tabCounts.tier1)}
                {renderFilterTab('tier2', 'Tier 2 (10%)', tabCounts.tier2)}
                {renderFilterTab('tier3', 'Tier 3 (15%)', tabCounts.tier3)}
                {renderFilterTab('tier4', 'Tier 4 (20%)', tabCounts.tier4)}
                {renderFilterTab('reviewed', 'Reviewed', tabCounts.reviewed)}
                {renderFilterTab('skipped', 'Skipped', tabCounts.skipped)}
              </div>

              {/* ── Tenant List (scrollable) ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                {groupedTenants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 48, color: C.textMuted, fontSize: 14 }}>
                    {facilityTenants.length === 0
                      ? 'No ECRI recommendations loaded for this facility.'
                      : 'No tenants match the current filter.'}
                  </div>
                )}

                {groupedTenants.map(group => {
                  const isGroupCollapsed = collapsedGroups.has(group.key);
                  const gpRev = groupPotentialRevenue(group);
                  const gpPending = groupPendingCount(group);
                  const occPct = Math.round(group.occupancy * 100);
                  const occColor = occPct > 85 ? C.positive : occPct >= 75 ? C.warning : C.negative;

                  const t1 = group.tenants.filter(t => t.assignedTier === 1).length;
                  const t2 = group.tenants.filter(t => t.assignedTier === 2).length;
                  const t3 = group.tenants.filter(t => t.assignedTier === 3).length;
                  const t4 = group.tenants.filter(t => t.assignedTier === 4).length;
                  const tierParts: string[] = [];
                  if (t1 > 0) tierParts.push(`${t1} at 40%`);
                  if (t2 > 0) tierParts.push(`${t2} at 10%`);
                  if (t3 > 0) tierParts.push(`${t3} at 15%`);
                  if (t4 > 0) tierParts.push(`${t4} at 20%`);

                  return (
                    <div key={group.key} style={{ marginBottom: 16 }}>
                      {/* ── Unit Group Header ── */}
                      <div
                        onClick={() => toggleGroup(group.key)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          background: C.card, border: `1px solid ${C.border}`, marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: C.textMuted }}>
                              {isGroupCollapsed ? '▶' : '▼'}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                              {group.unitGroup}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textSecondary, marginTop: 4, paddingLeft: 20 }}>
                            <span>Occ: <span style={{ color: occColor, fontWeight: 600 }}>{group.occupancyOccupied}/{group.occupancyTotal} ({occPct}%)</span></span>
                            <span>Median: <span style={{ fontWeight: 600 }}>${group.median}</span></span>
                            <span>Street: <span style={{ fontWeight: 600 }}>${group.streetRate}</span></span>
                            {tierParts.length > 0 && <span>{tierParts.join(', ')}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: C.textSecondary }}>
                            {group.tenants.length} tenants · <span style={{ color: C.positive }}>+${gpRev}/mo</span>
                          </span>
                          {gpPending > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); handleBulkApprove(undefined, group.key); }}
                              style={{
                                padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                                border: `1px solid ${C.positive}`, background: 'transparent',
                                color: C.positive, cursor: 'pointer',
                              }}
                            >
                              Approve All
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── Tenant Cards ── */}
                      {!isGroupCollapsed && group.tenants.map(tenant => {
                        // ── APPROVED / MODIFIED STATE ──
                        if (tenant.status === 'approved' || tenant.status === 'modified') {
                          const increase = (tenant.approvedAmount || 0) - tenant.currentRent;
                          const isModified = tenant.status === 'modified';
                          return (
                            <div key={tenant.id} style={{
                              padding: '10px 14px', borderRadius: 8, marginBottom: 4,
                              background: isModified ? '#FFFBEB' : '#F0FDF4',
                              border: `1px solid ${isModified ? '#FDE68A' : '#BBF7D0'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              opacity: 0.85,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.textSecondary }}>
                                <span style={{
                                  padding: '1px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                                  color: '#fff', background: tierColor(tenant.assignedTier),
                                }}>T{tenant.assignedTier}</span>
                                <span style={{ color: isModified ? C.warning : C.positive, fontWeight: 600 }}>
                                  {isModified ? '✎' : '✓'}
                                </span>
                                {tenant.customerName} · ${tenant.currentRent} → ${tenant.approvedAmount}
                                {' '}(+${increase}/mo, +{((increase / tenant.currentRent) * 100).toFixed(0)}%)
                                {isModified && tenant.overrideReason && (
                                  <span style={{ color: C.textMuted }}> · {tenant.overrideReason}</span>
                                )}
                              </div>
                              {undoAvailable.has(tenant.id) && (
                                <button
                                  onClick={() => handleUndo(tenant.id)}
                                  style={{
                                    padding: '3px 10px', borderRadius: 4, fontSize: 12,
                                    border: `1px solid ${C.border}`, background: C.card,
                                    color: C.textSecondary, cursor: 'pointer',
                                  }}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          );
                        }

                        // ── SKIPPED STATE ──
                        if (tenant.status === 'skipped') {
                          return (
                            <div key={tenant.id} style={{
                              padding: '10px 14px', borderRadius: 8, marginBottom: 4,
                              background: C.bg, border: `1px solid ${C.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              opacity: 0.7,
                            }}>
                              <span style={{ fontSize: 13, color: C.textMuted }}>
                                ○ {tenant.customerName} · ${tenant.currentRent}/mo · Skipped
                              </span>
                              <button
                                onClick={() => handleUndo(tenant.id)}
                                style={{
                                  padding: '3px 10px', borderRadius: 4, fontSize: 12,
                                  border: `1px solid ${C.border}`, background: C.card,
                                  color: C.textSecondary, cursor: 'pointer',
                                }}
                              >
                                Undo
                              </button>
                            </div>
                          );
                        }

                        // ── PENDING STATE ──
                        const isExpanded = expandedTenantId === tenant.id;
                        const isModifying = modifyingTenantId === tenant.id;
                        const hasFlags = tenant.isAboveStreet || tenant.isSeasonalLowRate || tenant.isMultiUnit || tenant.isLeaseUp;

                        return (
                          <div key={tenant.id} style={{
                            padding: '14px 16px', borderRadius: 10, marginBottom: 6,
                            background: C.card, border: `1px solid ${C.border}`,
                          }}>
                            {/* Row 1: Tier badge + Name + Unit info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                                color: '#fff', background: tierColor(tenant.assignedTier),
                                minWidth: 24, textAlign: 'center',
                              }}>
                                T{tenant.assignedTier}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
                                {tenant.customerName}
                              </span>
                              <span style={{ fontSize: 12, color: C.textSecondary }}>
                                {tenant.unitType} · Unit {tenant.unitNumber} · {tenant.tenureMonths} mo
                              </span>
                            </div>

                            {/* Row 2: Price change */}
                            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, paddingLeft: 8 }}>
                              <span style={{ color: C.textPrimary }}>${tenant.currentRent}/mo</span>
                              <span style={{ color: C.textMuted }}> → </span>
                              <span style={{ color: C.textPrimary }}>${tenant.recommendedNewRent}/mo</span>
                              <span style={{ color: C.positive, fontSize: 13, marginLeft: 8 }}>
                                (+${tenant.recommendedIncrease}, +{(tenant.tierPercent * 100).toFixed(0)}%)
                              </span>
                            </div>

                            {/* Row 3: Key metrics */}
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textSecondary, marginTop: 6, paddingLeft: 8 }}>
                              <span>TvS: <span style={{
                                color: tenant.tenantVsStreet > 0 ? C.negative : C.positive, fontWeight: 600,
                              }}>{tenant.tenantVsStreet >= 0 ? '+' : ''}{(tenant.tenantVsStreet * 100).toFixed(1)}%</span></span>
                              <span>%Delta: <span style={{ fontWeight: 600 }}>
                                {tenant.newRateDeltaToMedian >= 0 ? '+' : ''}{(tenant.newRateDeltaToMedian * 100).toFixed(1)}%
                              </span></span>
                              <span>Occ: <span style={{
                                fontWeight: 600,
                                color: tenant.unitGroupOccupancy > 0.85 ? C.positive
                                  : tenant.unitGroupOccupancy >= 0.75 ? C.warning : C.negative,
                              }}>{(tenant.unitGroupOccupancy * 100).toFixed(0)}%</span></span>
                            </div>

                            {/* Row 4: Flag badges */}
                            {(hasFlags || tenant.isFirstECRI) && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 8, flexWrap: 'wrap' }}>
                                {tenant.isAboveStreet && <FlagBadge label="Above Street" color={C.negative} />}
                                {tenant.isSeasonalLowRate && <FlagBadge label="Seasonal Low" color={C.warning} />}
                                {tenant.isMultiUnit && <FlagBadge label="Multi-Unit" color={C.info} />}
                                {tenant.isLeaseUp && <FlagBadge label="Lease-Up" color={C.aiAccent} />}
                                {tenant.isFirstECRI && <FlagBadge label="1st ECRI" color={C.info} />}
                              </div>
                            )}

                            {/* Row 5: Actions */}
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                              gap: 8, marginTop: 10,
                            }}>
                              <button
                                onClick={() => handleApprove(tenant.id)}
                                style={{
                                  padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                  background: C.positive, color: '#fff', fontSize: 13, fontWeight: 600,
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setModifyingTenantId(tenant.id);
                                  setModifyAmount(String(tenant.recommendedNewRent));
                                  setModifyReason('');
                                }}
                                style={{
                                  padding: '6px 18px', borderRadius: 6, cursor: 'pointer',
                                  border: `1px solid ${C.warning}`, background: 'transparent',
                                  color: C.warning, fontSize: 13, fontWeight: 500,
                                }}
                              >
                                Modify
                              </button>
                              <button
                                onClick={() => handleSkip(tenant.id)}
                                style={{
                                  padding: '6px 18px', borderRadius: 6, cursor: 'pointer',
                                  border: `1px solid ${C.border}`, background: 'transparent',
                                  color: C.textSecondary, fontSize: 13, fontWeight: 500,
                                }}
                              >
                                Skip
                              </button>
                              <button
                                onClick={() => toggleExpand(tenant.id)}
                                style={{
                                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                                  border: `1px solid ${C.border}`, background: 'transparent',
                                  color: C.textSecondary, fontSize: 12,
                                }}
                              >
                                {isExpanded ? 'Collapse ▲' : 'Detail ▼'}
                              </button>
                            </div>

                            {/* ── INLINE MODIFY FLOW ── */}
                            {isModifying && (
                              <div style={{
                                marginTop: 12, padding: 14, borderRadius: 8,
                                background: '#FFFBEB', border: `1px solid #FDE68A`,
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.warning, marginBottom: 8 }}>
                                  Modify Recommendation
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  <label style={{ fontSize: 12, color: C.textSecondary }}>New rent: $</label>
                                  <input
                                    type="number"
                                    value={modifyAmount}
                                    onChange={e => setModifyAmount(e.target.value)}
                                    style={{
                                      width: 90, padding: '6px 10px', borderRadius: 6,
                                      border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
                                    }}
                                  />
                                  <span style={{ fontSize: 12, color: C.textMuted }}>
                                    (+{modifyAmount ? ((parseFloat(modifyAmount) - tenant.currentRent) / tenant.currentRent * 100).toFixed(1) : '0'}%
                                    · +${modifyAmount ? Math.round(parseFloat(modifyAmount) - tenant.currentRent) : 0}/mo)
                                  </span>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                  <select
                                    value={modifyReason}
                                    onChange={e => setModifyReason(e.target.value)}
                                    style={{
                                      width: '100%', padding: '6px 10px', borderRadius: 6,
                                      border: `1px solid ${C.border}`, fontSize: 12, outline: 'none',
                                      color: modifyReason ? C.textPrimary : C.textMuted,
                                    }}
                                  >
                                    <option value="">Select override reason (required)...</option>
                                    {OVERRIDE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleModify(tenant.id)}
                                    disabled={!modifyReason || !modifyAmount}
                                    style={{
                                      padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                      background: modifyReason && modifyAmount ? C.positive : '#94A3B8',
                                      color: '#fff', fontSize: 13, fontWeight: 600,
                                    }}
                                  >
                                    Save Override
                                  </button>
                                  <button
                                    onClick={() => { setModifyingTenantId(null); setModifyAmount(''); setModifyReason(''); }}
                                    style={{
                                      padding: '6px 18px', borderRadius: 6, cursor: 'pointer',
                                      border: `1px solid ${C.border}`, background: 'transparent',
                                      color: C.textSecondary, fontSize: 13,
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── EXPANDED DETAIL ── */}
                            {isExpanded && (
                              <div style={{ paddingTop: 16, marginTop: 12, borderTop: `1px solid ${C.border}` }}>
                                {/* Tier Rationale */}
                                <div style={{
                                  marginBottom: 16, padding: 14, borderRadius: 8,
                                  background: '#F5F3FF', border: '1px solid #E0E7FF',
                                }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: C.aiAccent, marginBottom: 8 }}>
                                    Tier Rationale
                                  </div>
                                  <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
                                    <strong>{tierLabel(tenant.assignedTier)}</strong>: After 20% trial (${tenant.trialRate.toFixed(0)}),
                                    tenant is {tenant.newRateDeltaToMedian >= 0 ? '+' : ''}{(tenant.newRateDeltaToMedian * 100).toFixed(1)}% vs
                                    median (${tenant.unitGroupMedian}). TvS is {tenant.tenantVsStreet >= 0 ? '+' : ''}{(tenant.tenantVsStreet * 100).toFixed(1)}% vs
                                    street (${tenant.streetRate}).
                                    {tenant.assignedTier === 1 && (
                                      <> Below -20% threshold AND occupancy {(tenant.unitGroupOccupancy * 100).toFixed(0)}% &gt; 75%. Aggressive catch-up recommended.</>
                                    )}
                                    {tenant.assignedTier === 2 && (
                                      <> Above +75% median threshold. Premium payer — conservative 10% increase to retain.</>
                                    )}
                                    {tenant.assignedTier === 3 && (
                                      <> Both TvS ({(tenant.tenantVsStreet * 100).toFixed(1)}%) and %Delta ({(tenant.newRateDeltaToMedian * 100).toFixed(1)}%) exceed +15% threshold. Moderate 15% increase.</>
                                    )}
                                    {tenant.assignedTier === 4 && (
                                      <> Does not meet Tier 1 (&lt;-20% + &gt;75% occ), Tier 2 (&gt;+75%), or Tier 3 (&gt;+15% TvS AND &gt;+15% median). Standard 20% baseline.</>
                                    )}
                                  </div>
                                </div>

                                {/* Unit Group Context */}
                                <div style={{
                                  display: 'flex', gap: 24, marginBottom: 16, fontSize: 12, color: C.textSecondary,
                                  padding: '10px 14px', background: C.bg, borderRadius: 8,
                                  flexWrap: 'wrap',
                                }}>
                                  <div><strong>Unit Group:</strong> {tenant.unitGroup}</div>
                                  <div><strong>Occupancy:</strong> {tenant.unitGroupOccupied}/{tenant.unitGroupTotal} ({(tenant.unitGroupOccupancy * 100).toFixed(0)}%)</div>
                                  <div><strong>Median:</strong> ${tenant.unitGroupMedian}</div>
                                  <div><strong>Street:</strong> ${tenant.streetRate}</div>
                                  <div><strong>Trial Rate:</strong> ${tenant.trialRate.toFixed(0)}</div>
                                </div>

                                {/* Competitor Table */}
                                {tenant.competitors.length > 0 && (
                                  <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>
                                        Competitors ({tenant.competitors.length})
                                      </span>
                                      <span style={{ fontSize: 13, color: C.textSecondary }}>
                                        Street Rate: ${tenant.streetRate}
                                      </span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                      <thead>
                                        <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                                          {['Competitor', 'Quality', 'Type', 'Dist', 'Rate', 'Weight', 'Seen'].map(h => (
                                            <th key={h} style={{
                                              padding: '6px 8px', fontWeight: 600, color: C.textMuted,
                                              textAlign: h === 'Competitor' || h === 'Type' ? 'left' : h === 'Quality' ? 'center' : 'right',
                                            }}>
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tenant.competitors.map((comp, i) => (
                                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 500 }}>{comp.name}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                              <span style={{
                                                display: 'inline-block', width: 22, height: 22, borderRadius: 4,
                                                textAlign: 'center', lineHeight: '22px', fontSize: 11, fontWeight: 700,
                                                color: '#fff', background: qualityColor(comp.quality),
                                              }}>{comp.quality}</span>
                                            </td>
                                            <td style={{ padding: '6px 8px', color: C.textSecondary }}>{comp.unitType} {comp.features}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textSecondary }}>{comp.distance}mi</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>${comp.rate}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textSecondary }}>{comp.weight}%</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textMuted }}>{comp.lastSeen}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* ECRI History */}
                                <div style={{ fontSize: 12, color: C.textSecondary, paddingBottom: 4 }}>
                                  {tenant.isFirstECRI && (
                                    <span style={{
                                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                                      background: '#DBEAFE', color: C.info, fontSize: 11, fontWeight: 600, marginRight: 8,
                                    }}>1st ECRI</span>
                                  )}
                                  {tenant.previousIncreases.length === 0
                                    ? 'No previous increases'
                                    : `${tenant.previousIncreases.length} previous increase${tenant.previousIncreases.length > 1 ? 's' : ''}: ${tenant.previousIncreases.map(pi => `+$${pi.amount} on ${pi.date}`).join(', ')}`
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
