import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserContext } from "@/lib/auth/user-context";

export type CurrentEmployeeRecord = {
  id: string;
  employeeNo: string | null;
  firstName: string;
  lastName: string;
  workEmail: string | null;
};

type EmployeeRow = {
  id: string;
  employee_no: string | null;
  first_name: string;
  last_name: string;
  work_email: string | null;
};

export async function resolveCurrentEmployeeForUser(input: {
  supabase: SupabaseClient;
  context: UserContext;
}): Promise<CurrentEmployeeRecord | null> {
  const email = input.context.email?.trim();
  if (!email) {
    return null;
  }

  const { data, error } = await input.supabase
    .from("employees")
    .select("id, employee_no, first_name, last_name, work_email")
    .eq("company_id", input.context.companyId)
    .eq("is_active", true)
    .ilike("work_email", email)
    .limit(2);

  if (error) {
    throw new Error(`Failed to resolve current employee record: ${error.message}`);
  }

  const rows = (data ?? []) as EmployeeRow[];
  if (!rows.length) {
    return null;
  }

  if (rows.length > 1) {
    throw new Error("Multiple active employee records found for the current user email");
  }

  const row = rows[0];
  return {
    id: row.id,
    employeeNo: row.employee_no,
    firstName: row.first_name,
    lastName: row.last_name,
    workEmail: row.work_email,
  };
}
