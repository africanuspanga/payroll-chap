import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentEmployeeForUser } from "@/lib/auth/employee-context";
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

    let employees: EmployeeRow[] = [];
    let employeesError: { message: string } | null = null;

    if (context.role === "employee") {
      const currentEmployee = await resolveCurrentEmployeeForUser({ supabase, context });
      if (!currentEmployee) {
        return fail("Current user is not linked to an active employee record", 403);
      }

      employees = [
        {
          id: currentEmployee.id,
          employee_no: currentEmployee.employeeNo,
          first_name: currentEmployee.firstName,
          last_name: currentEmployee.lastName,
        },
      ];
    } else {
      const { data, error } = await supabase
        .from("employees")
        .select("id, employee_no, first_name, last_name")
        .eq("company_id", context.companyId)
        .eq("is_active", true)
        .order("first_name", { ascending: true });

      employees = (data ?? []) as EmployeeRow[];
      employeesError = error;
    }

    const { data: leavePolicies, error: policiesError } = await supabase
      .from("leave_policies")
      .select("id, code, name, is_paid")
      .eq("company_id", context.companyId)
      .order("name", { ascending: true });

    if (employeesError || policiesError) {
      return fail("Failed to load leave setup", 500, {
        employees: employeesError?.message,
        policies: policiesError?.message,
      });
    }

    return ok({
      employees: employees.map((employee: EmployeeRow) => ({
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
