/**
 * CANONICAL UNIT TYPE DEFINITIONS
 * ================================
 * Industry-standard unit sizes for self-storage (ExtraSpace, Morningstar, Public Storage, etc.)
 *
 * USAGE: Import from here in ALL modules that reference unit types.
 * DO NOT define unit sizes elsewhere. This is the single source of truth.
 */

// ---------------------------------------------------------------------------
// STANDARD UNIT SIZES (industry convention: Width x Depth in feet)
// ---------------------------------------------------------------------------

export interface UnitSizeConfig {
  /** Dimensional size, e.g. "5x5", "10x10" */
  size: string;
  /** Square footage */
  sqft: number;
  /** Cubic footage (assuming 8ft ceiling) */
  cuft: number;
  /** Base monthly rate (non-climate, used for seeding/estimates) */
  baseRate: number;
  /** Climate-controlled rate multiplier */
  climateMultiplier: number;
  /** Typical use case (for tooltips/help only; do not use for unit group or unit type labels) */
  useCase: string;
  /** Size category */
  category: "small" | "medium" | "large";
}

/**
 * Standard unit sizes per industry convention (ExtraSpace, Morningstar, etc.)
 * Ordered from smallest to largest.
 */
export const UNIT_SIZES: UnitSizeConfig[] = [
  {
    size: "5x5",
    sqft: 25,
    cuft: 200,
    baseRate: 55,
    climateMultiplier: 1.25,
    useCase: "25 sq ft — boxes, seasonal items",
    category: "small",
  },
  {
    size: "5x10",
    sqft: 50,
    cuft: 400,
    baseRate: 85,
    climateMultiplier: 1.25,
    useCase: "50 sq ft — mattress, small furniture",
    category: "small",
  },
  {
    size: "5x15",
    sqft: 75,
    cuft: 600,
    baseRate: 110,
    climateMultiplier: 1.25,
    useCase: "1-bedroom apartment",
    category: "small",
  },
  {
    size: "10x10",
    sqft: 100,
    cuft: 800,
    baseRate: 135,
    climateMultiplier: 1.25,
    useCase: "2-bedroom apartment, small office",
    category: "medium",
  },
  {
    size: "10x15",
    sqft: 150,
    cuft: 1200,
    baseRate: 175,
    climateMultiplier: 1.25,
    useCase: "2-bedroom house, large office",
    category: "medium",
  },
  {
    size: "10x20",
    sqft: 200,
    cuft: 1600,
    baseRate: 215,
    climateMultiplier: 1.2,
    useCase: "3-bedroom house, vehicle storage",
    category: "large",
  },
  {
    size: "10x25",
    sqft: 250,
    cuft: 2000,
    baseRate: 250,
    climateMultiplier: 1.2,
    useCase: "3-4 bedroom house, commercial",
    category: "large",
  },
  {
    size: "10x30",
    sqft: 300,
    cuft: 2400,
    baseRate: 295,
    climateMultiplier: 1.2,
    useCase: "4+ bedroom house, large vehicle, commercial",
    category: "large",
  },
];

/**
 * Quick lookup: size string -> config
 */
export const UNIT_SIZE_MAP: Map<string, UnitSizeConfig> = new Map(
  UNIT_SIZES.map((u) => [u.size, u])
);

/**
 * All valid size strings (for validation)
 */
export const VALID_SIZES: string[] = UNIT_SIZES.map((u) => u.size);

// ---------------------------------------------------------------------------
// DISPLAY FORMATTING (single source of truth for unit/unit group labels)
// ---------------------------------------------------------------------------
// Use only formatUnitTypeDisplay / formatUnitTypeShort for unit type or unit group
// labels anywhere in the app. Do not use useCase, displayName, or any other names
// (e.g. "small closet", "half garage") for labels.

export interface UnitTypeDisplayInput {
  size: string;
  climateControlled: boolean;
  displayName?: string | null;
}

/**
 * Format unit type for display (industry-standard).
 * Climate controlled: size + " CC". Not climate controlled: size + " NCC".
 * Examples: "10x10 CC", "10x30 NCC"
 *
 * Always derived from size + climate from this module. displayName is not used for labels
 * so that this file is the single source of truth and no alternate names (e.g. "small closet")
 * ever appear in the app.
 */
export function formatUnitTypeDisplay(unitType: UnitTypeDisplayInput): string {
  return `${unitType.size} ${unitType.climateControlled ? "CC" : "NCC"}`;
}

/**
 * Format unit type as short label (for tables, compact UI).
 * Examples: "10x10 CC", "10x30 NCC"
 */
export function formatUnitTypeShort(unitType: UnitTypeDisplayInput): string {
  return `${unitType.size} ${unitType.climateControlled ? "CC" : "NCC"}`;
}

/**
 * Build displayName for storage (use when creating unit types).
 * Format: "10x10 CC" or "10x30 NCC"
 */
export function buildUnitTypeDisplayName(
  size: string,
  climateControlled: boolean
): string {
  return `${size} ${climateControlled ? "CC" : "NCC"}`;
}

// ---------------------------------------------------------------------------
// RATE HELPERS
// ---------------------------------------------------------------------------

/**
 * Get base rate for a unit size (non-climate).
 */
export function getBaseRate(size: string): number {
  return UNIT_SIZE_MAP.get(size)?.baseRate ?? 100;
}

/**
 * Get climate-controlled rate for a unit size.
 */
export function getClimateRate(size: string): number {
  const config = UNIT_SIZE_MAP.get(size);
  if (!config) return 125;
  return Math.round(config.baseRate * config.climateMultiplier);
}

/**
 * Get rate for a unit type (handles climate multiplier).
 */
export function getUnitRate(size: string, climateControlled: boolean): number {
  return climateControlled ? getClimateRate(size) : getBaseRate(size);
}

// ---------------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------------

/**
 * Check if a size string is valid.
 */
export function isValidSize(size: string): boolean {
  return UNIT_SIZE_MAP.has(size);
}

/**
 * Parse a size string into width and depth.
 * Returns null if invalid format.
 */
export function parseSize(size: string): { width: number; depth: number } | null {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: parseInt(match[1], 10), depth: parseInt(match[2], 10) };
}

// ---------------------------------------------------------------------------
// CATEGORY HELPERS
// ---------------------------------------------------------------------------

export type SizeCategory = "small" | "medium" | "large";

/**
 * Get size category for a unit size.
 */
export function getSizeCategory(size: string): SizeCategory {
  return UNIT_SIZE_MAP.get(size)?.category ?? "medium";
}

/**
 * Get all sizes in a category.
 */
export function getSizesByCategory(category: SizeCategory): string[] {
  return UNIT_SIZES.filter((u) => u.category === category).map((u) => u.size);
}

/**
 * Category labels for display.
 */
export const SIZE_CATEGORY_LABELS: Record<SizeCategory, string> = {
  small: "Small (25–75 sq ft)",
  medium: "Medium (100–150 sq ft)",
  large: "Large (200–300+ sq ft)",
};
