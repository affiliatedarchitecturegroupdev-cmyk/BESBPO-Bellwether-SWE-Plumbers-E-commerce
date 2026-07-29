export interface AppliedMultiplier {
  code: string;
  label: string;
  multiplier: number;
}

export interface MaterialLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PricingResult {
  sector: string;
  serviceCode: string;
  // Labor: base rate scaled by the *product* of all applied complexity
  // multipliers (e.g. multi-storey x confined-space), per the original
  // pricing model — multipliers compound, they don't stack additively.
  baseLaborRate: number;
  appliedMultipliers: AppliedMultiplier[];
  laborSubtotal: number;
  // Materials: priced independently at retail or trade rate — this is the
  // decoupled labor/material billing the commercial model is built on, so
  // material cost is never itself multiplied by complexity.
  materials: MaterialLine[];
  materialsSubtotal: number;
  subtotal: number;
  vatAmount: number;
  total: number;
}
