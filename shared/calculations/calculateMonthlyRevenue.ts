/**
 * Input shapes for facility revenue calculation.
 * Use customers for actual rent roll; use unit types for estimated revenue from street rate × occupancy.
 */
export interface FacilityCustomerInput {
  currentRent: number;
}

export interface FacilityUnitTypeInput {
  streetRate: number;
  occupiedUnits: number;
}

export interface FacilityRevenueInput {
  /** When provided, monthly revenue = sum of currentRent (actual rent roll). */
  customers?: FacilityCustomerInput[];
  /** When customers are not provided, monthly revenue = sum of streetRate × occupiedUnits per type. */
  unitTypes?: FacilityUnitTypeInput[];
}

/**
 * Calculates total monthly revenue for a facility from either customer rents or unit type occupancy.
 * Prefers customer data when present (actual revenue); otherwise uses unit types (estimated).
 *
 * @param facility - Facility data with customers and/or unit types
 * @returns Total monthly revenue (0 if no data or empty arrays)
 */
export function calculateMonthlyRevenue(facility: FacilityRevenueInput): number {
  if (facility.customers && facility.customers.length > 0) {
    return facility.customers.reduce((sum, c) => sum + c.currentRent, 0);
  }

  if (facility.unitTypes && facility.unitTypes.length > 0) {
    return facility.unitTypes.reduce(
      (sum, u) => sum + u.streetRate * u.occupiedUnits,
      0
    );
  }

  return 0;
}
