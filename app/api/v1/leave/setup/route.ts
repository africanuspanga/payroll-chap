import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequiredUserContext } from "@/lib/auth/user-context";
import { ok, fail } from "@/lib/http";

type EmployeeRow = {
  id: string;
  employee_no: string | null;
  first_name: string;
  last_name: string;
};

type LeavePolicyRow = {
  id: string;
  code: string;
  name: string;
  is_paid: boolean;
};

export async function GET() {
  try {
    const context = await getRequiredUserContext("/leave");
    const supabase = await createSupabaseServerClient();

    const [{ data: employees, error: employeesError }, { data: leavePolicies, error: policiesError }] =
      await Promise.all([
        supabase
          .from("employees")
          .select("id, employee_no, first_name, last_name")
          .eq("company_id", context.companyId)
          .eq("is_active", true)
          .order("first_name", { ascending: true }),
        supabase
          .from("leave_policies")
          .select("id, code, name, is_paid")
          .eq("company_id", context.companyId)
          .order("name", { ascending: true }),
      ]);

    if (employeesError || policiesError) {
      return fail("Failed to load leave setup", 500, {
        employees: employeesError?.message,
        policies: policiesError?.message,
      });
    }

    return ok({
      employees: ((employees ?? []) as EmployeeRow[]).map((employee: EmployeeRow) => ({
        id: employee.id,
        label: `${employee.first_name} ${employee.last_name}${employee.employee_no ? ` (${employee.employee_no})` : ""}`,
      })),
      leavePolicies: ((leavePolicies ?? []) as LeavePolicyRow[]).map((policy: LeavePolicyRow) => ({
        id: policy.id,
        code: policy.code,
        name: policy.name,
        isPaid: policy.is_paid,
      })),
    });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
