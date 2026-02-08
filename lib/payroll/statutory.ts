export type ProgressiveBand = {
  from: number;
  to: number | null;
  rate: number;
};

export type VehicleBenefitBand = {
  min_engine_cc?: number;
  max_engine_cc?: number;
  max_age_years?: number;
  min_age_years?: number;
  amount: number;
};

export type PayrollRuleConfig = {
  sdlRate: number;
  sdlEmployeeThreshold: number;
  nonResidentPayeRate: number;
  directorNonFullTimeRate: number;
  secondaryEmploymentRate: number;
  nssfEmployeeRate: number;
  bikHousingIncomeRate: number;
  bikLoanStatutoryInterestRate: number;
  filingPenaltyDailyRate: number;
  payeBandsResidentPrimary: ProgressiveBand[];
  motorVehicleBenefitBands: VehicleBenefitBand[];
};

export type EmployeeTaxProfile = {
  taxResidency: "resident" | "non_resident";
  isPrimaryEmployment: boolean;
  isNonFullTimeDirector: boolean;
};

export type HousingBikInput = {
  marketRent: number;
  employerDeductibleExpense: number;
  employeeContribution: number;
  referenceIncome: number;
};

export type VehicleBikInput = {
  engineCc: number;
  vehicleAgeYears: number;
  employerClaimsDeduction: boolean;
};

export type LoanBikInput = {
  principalOutstanding: number;
  employeeInterestRate: number;
};

const defaultResidentBands: ProgressiveBand[] = [
  { from: 0, to: 270_000, rate: 0 },
  { from: 270_000.01, to: 520_000, rate: 0.08 },
  { from: 520_000.01, to: 760_000, rate: 0.2 },
  { from: 760_000.01, to: 1_000_000, rate: 0.25 },
  { from: 1_000_000.01, to: null, rate: 0.3 },
];

const defaultVehicleBands: VehicleBenefitBand[] = [
  { max_engine_cc: 1000, max_age_years: 5, amount: 250_000 },
  { max_engine_cc: 1000, min_age_years: 6, amount: 125_000 },
  { min_engine_cc: 1001, max_engine_cc: 2000, max_age_years: 5, amount: 500_000 },
  { min_engine_cc: 1001, max_engine_cc: 2000, min_age_years: 6, amount: 250_000 },
  { min_engine_cc: 2001, max_engine_cc: 3000, max_age_years: 5, amount: 1_000_000 },
  { min_engine_cc: 2001, max_engine_cc: 3000, min_age_years: 6, amount: 500_000 },
  { min_engine_cc: 3001, max_age_years: 5, amount: 1_500_000 },
  { min_engine_cc: 3001, min_age_years: 6, amount: 750_000 },
];

export const defaultPayrollRuleConfig: PayrollRuleConfig = {
  sdlRate: 0.035,
  sdlEmployeeThreshold: 10,
  nonResidentPayeRate: 0.15,
  directorNonFullTimeRate: 0.15,
  secondaryEmploymentRate: 0.3,
  nssfEmployeeRate: 0.1,
  bikHousingIncomeRate: 0.15,
  bikLoanStatutoryInterestRate: 0.16,
  filingPenaltyDailyRate: 0.0005,
  payeBandsResidentPrimary: defaultResidentBands,
  motorVehicleBenefitBands: defaultVehicleBands,
};

export function resolvePayrollRuleConfig(entryMap: Record<string, unknown>): PayrollRuleConfig {
  const sdl = asObject(entryMap.SDL_RATE);
  const nonResident = asObject(entryMap.NON_RESIDENT_PAYE_RATE);
  const director = asObject(entryMap.DIRECTOR_NON_FULL_TIME_RATE);
  const secondary = asObject(entryMap.SECONDARY_EMPLOYMENT_RATE);
  const nssf = asObject(entryMap.NSSF_EMPLOYEE_RATE);
  const bikHousing = asObject(entryMap.BIK_HOUSING);
  const bikLoan = asObject(entryMap.BIK_LOAN);
  const penalty = asObject(entryMap.FILING_PENALTY_DAILY_RATE);
  const payeBands = asObject(entryMap.PAYE_BANDS_RESIDENT_PRIMARY);
  const motorBands = asObject(entryMap.MOTOR_VEHICLE_BIK_ANNUAL);

  return {
    sdlRate: asNumber(sdl.rate, defaultPayrollRuleConfig.sdlRate),
    sdlEmployeeThreshold: asNumber(sdl.employee_threshold, defaultPayrollRuleConfig.sdlEmployeeThreshold),
    nonResidentPayeRate: asNumber(nonResident.rate, defaultPayrollRuleConfig.nonResidentPayeRate),
    directorNonFullTimeRate: asNumber(director.rate, defaultPayrollRuleConfig.directorNonFullTimeRate),
    secondaryEmploymentRate: asNumber(secondary.rate, defaultPayrollRuleConfig.secondaryEmploymentRate),
    nssfEmployeeRate: asNumber(nssf.rate, defaultPayrollRuleConfig.nssfEmployeeRate),
    bikHousingIncomeRate: asNumber(bikHousing.income_rate, defaultPayrollRuleConfig.bikHousingIncomeRate),
    bikLoanStatutoryInterestRate: asNumber(
      bikLoan.statutory_interest_rate,
      defaultPayrollRuleConfig.bikLoanStatutoryInterestRate,
    ),
    filingPenaltyDailyRate: asNumber(penalty.rate, defaultPayrollRuleConfig.filingPenaltyDailyRate),
    payeBandsResidentPrimary: parseBands(payeBands.bands, defaultPayrollRuleConfig.payeBandsResidentPrimary),
    motorVehicleBenefitBands: parseVehicleBands(motorBands.bands, defaultPayrollRuleConfig.motorVehicleBenefitBands),
  };
}

export function calculateSDL(input: {
  totalGrossEmoluments: number;
  employeeCount: number;
  rules: PayrollRuleConfig;
}) {
  return input.employeeCount >= input.rules.sdlEmployeeThreshold
    ? round2(input.totalGrossEmoluments * input.rules.sdlRate)
    : 0;
}

export function calculatePAYE(input: {
  taxablePay: number;
  profile: EmployeeTaxProfile;
  rules: PayrollRuleConfig;
}) {
  const taxablePay = Math.max(0, input.taxablePay);

  if (input.profile.isNonFullTimeDirector) {
    return round2(taxablePay * input.rules.directorNonFullTimeRate);
  }

  if (input.profile.taxResidency === "non_resident") {
    return round2(taxablePay * input.rules.nonResidentPayeRate);
  }

  if (!input.profile.isPrimaryEmployment) {
    return round2(taxablePay * input.rules.secondaryEmploymentRate);
  }

  return round2(calculateProgressiveTax(taxablePay, input.rules.payeBandsResidentPrimary));
}

export function calculateNssfEmployeeDeduction(input: {
  pensionablePay: number;
  rules: PayrollRuleConfig;
}) {
  return round2(Math.max(0, input.pensionablePay) * input.rules.nssfEmployeeRate);
}

export function calculateHousingBik(input: HousingBikInput, rules: PayrollRuleConfig) {
  const marketRent = Math.max(0, input.marketRent);
  const employerExpense = Math.max(0, input.employerDeductibleExpense);
  const employeeContribution = Math.max(0, input.employeeContribution);
  const incomeBased = Math.max(0, input.referenceIncome) * rules.bikHousingIncomeRate;

  const quantified = Math.min(marketRent, Math.max(incomeBased, employerExpense));
  return round2(Math.max(0, quantified - employeeContribution));
}

export function calculateVehicleBik(input: VehicleBikInput, rules: PayrollRuleConfig) {
  if (!input.employerClaimsDeduction) {
    return 0;
  }

  const annualAmount =
    rules.motorVehicleBenefitBands.find((band) => {
      if (band.min_engine_cc !== undefined && input.engineCc < band.min_engine_cc) {
        return false;
      }
      if (band.max_engine_cc !== undefined && input.engineCc > band.max_engine_cc) {
        return false;
      }
      if (band.max_age_years !== undefined && input.vehicleAgeYears > band.max_age_years) {
        return false;
      }
      if (band.min_age_years !== undefined && input.vehicleAgeYears < band.min_age_years) {
        return false;
      }
      return true;
    })?.amount ?? 0;

  return round2(annualAmount / 12);
}

export function calculateLoanBik(input: LoanBikInput, rules: PayrollRuleConfig) {
  const principal = Math.max(0, input.principalOutstanding);
  const employeeRate = Math.max(0, input.employeeInterestRate);
  const rateDiff = Math.max(0, rules.bikLoanStatutoryInterestRate - employeeRate);
  return round2((principal * rateDiff) / 12);
}

export function calculateProgressiveTax(taxableAmount: number, bands: ProgressiveBand[]) {
  let tax = 0;

  for (const band of bands) {
    if (taxableAmount <= band.from) {
      continue;
    }

    const upper = band.to ?? taxableAmount;
    const taxableSlice = Math.max(0, Math.min(taxableAmount, upper) - band.from);

    if (taxableSlice > 0) {
      tax += taxableSlice * band.rate;
    }
  }

  return tax;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseBands(value: unknown, fallback: ProgressiveBand[]): ProgressiveBand[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const bands = value
    .map((band) => {
      const row = asObject(band);
      const from = Number(row.from);
      const rate = Number(row.rate);
      const toValue = row.to;
      const to = toValue === null || toValue === undefined ? null : Number(toValue);

      if (!Number.isFinite(from) || !Number.isFinite(rate) || (to !== null && !Number.isFinite(to))) {
        return null;
      }

      return { from, to, rate } as ProgressiveBand;
    })
    .filter((band): band is ProgressiveBand => band !== null)
    .sort((a, b) => a.from - b.from);

  return bands.length ? bands : fallback;
}

function parseVehicleBands(value: unknown, fallback: VehicleBenefitBand[]): VehicleBenefitBand[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const bands = value
    .map((band) => {
      const row = asObject(band);
      const amount = Number(row.amount);
      if (!Number.isFinite(amount)) {
        return null;
      }

      const parsed: VehicleBenefitBand = { amount };

      if (row.min_engine_cc !== undefined) parsed.min_engine_cc = Number(row.min_engine_cc);
      if (row.max_engine_cc !== undefined) parsed.max_engine_cc = Number(row.max_engine_cc);
      if (row.min_age_years !== undefined) parsed.min_age_years = Number(row.min_age_years);
      if (row.max_age_years !== undefined) parsed.max_age_years = Number(row.max_age_years);

      return parsed;
    })
    .filter((band): band is VehicleBenefitBand => band !== null);

  return bands.length ? bands : fallback;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
