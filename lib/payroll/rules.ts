import {
  defaultPayrollRuleConfig,
  resolvePayrollRuleConfig,
  type PayrollRuleConfig,
} from "@/lib/payroll/statutory";

type RuleSetRow = {
  id: string;
  version: string;
  effective_from: string;
  effective_to: string | null;
};

type RuleEntryRow = {
  key: string;
  value: unknown;
};

type SupabaseClientLike = {
  from: (table: string) => unknown;
};

export type LoadedPayrollRules = {
  ruleSetId: string | null;
  version: string;
  config: PayrollRuleConfig;
};

export async function loadActivePayrollRules(input: {
  supabase: SupabaseClientLike;
  companyId: string;
  asOfDate: string;
  jurisdiction?: string;
}) : Promise<LoadedPayrollRules> {
  const jurisdiction = input.jurisdiction ?? "mainland";

  const companyRuleSet = await findRuleSet({
    supabase: input.supabase,
    asOfDate: input.asOfDate,
    jurisdiction,
    companyId: input.companyId,
  });

  const selectedRuleSet =
    companyRuleSet ??
    (await findRuleSet({
      supabase: input.supabase,
      asOfDate: input.asOfDate,
      jurisdiction,
      companyId: null,
    }));

  if (!selectedRuleSet) {
    return {
      ruleSetId: null,
      version: "fallback-default",
      config: defaultPayrollRuleConfig,
    };
  }

  const entriesQuery = input.supabase.from("statutory_rule_entries") as {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{ data: RuleEntryRow[] | null; error: { message: string } | null }>;
    };
  };

  const { data: entries, error: entriesError } = await entriesQuery
    .select("key, value")
    .eq("rule_set_id", selectedRuleSet.id);

  if (entriesError) {
    throw new Error(`Failed to load statutory rule entries: ${entriesError.message}`);
  }

  const map = (entries ?? []).reduce((acc: Record<string, unknown>, row: RuleEntryRow) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    ruleSetId: selectedRuleSet.id,
    version: selectedRuleSet.version,
    config: resolvePayrollRuleConfig(map),
  };
}

async function findRuleSet(input: {
  supabase: SupabaseClientLike;
  companyId: string | null;
  asOfDate: string;
  jurisdiction: string;
}): Promise<RuleSetRow | null> {
  type RuleSetQuery = {
    select: (columns: string) => RuleSetQuery;
    eq: (column: string, value: unknown) => RuleSetQuery;
    lte: (column: string, value: string) => RuleSetQuery;
    or: (filter: string) => RuleSetQuery;
    order: (column: string, options: { ascending: boolean }) => RuleSetQuery;
    limit: (count: number) => RuleSetQuery;
    is: (column: string, value: null) => RuleSetQuery;
    maybeSingle: () => Promise<{ data: RuleSetRow | null; error: { message: string } | null }>;
  };

  let query = (input.supabase.from("statutory_rule_sets") as RuleSetQuery)
    .select("id, version, effective_from, effective_to")
    .eq("country_code", "TZ")
    .eq("jurisdiction", input.jurisdiction)
    .eq("rule_code", "TZ_PAYROLL_BASELINE")
    .lte("effective_from", input.asOfDate)
    .or(`effective_to.is.null,effective_to.gte.${input.asOfDate}`)
    .order("effective_from", { ascending: false })
    .limit(1);

  query = input.companyId ? query.eq("company_id", input.companyId) : query.is("company_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to load statutory rule set: ${error.message}`);
  }

  return (data as RuleSetRow | null) ?? null;
}
