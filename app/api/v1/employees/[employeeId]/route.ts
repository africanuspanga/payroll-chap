import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import { validateEmployeeInput, type EmployeeUpsertInput } from "@/lib/validation/employee";

export async function PATCH(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const { employeeId } = await params;
    const supabase = await createSupabaseServerClient();

    const body = (await request.json()) as EmployeeUpsertInput;
    const validation = validateEmployeeInput(body, "update");

    if (!validation.valid) {
      return fail("Invalid employee payload", 422, validation.errors);
    }

    const employeeUpdate: Record<string, unknown> = {
      metadata: {
        department: body.department ?? null,
        job_title: body.jobTitle ?? null,
      },
    };

    if (body.employeeNo !== undefined) employeeUpdate.employee_no = body.employeeNo;
    if (body.firstName !== undefined) employeeUpdate.first_name = body.firstName.trim();
    if (body.lastName !== undefined) employeeUpdate.last_name = body.lastName.trim();
    if (body.workEmail !== undefined) employeeUpdate.work_email = body.workEmail || null;
    if (body.phone !== undefined) employeeUpdate.phone = body.phone || null;
    if (body.hireDate !== undefined) employeeUpdate.hire_date = body.hireDate;
    if (body.employmentType !== undefined) employeeUpdate.employment_type = body.employmentType;
    if (body.taxResidency !== undefined) employeeUpdate.tax_residency = body.taxResidency;
    if (body.isPrimaryEmployment !== undefined) employeeUpdate.is_primary_employment = body.isPrimaryEmployment;
    if (body.isNonFullTimeDirector !== undefined) {
      employeeUpdate.is_non_full_time_director = body.isNonFullTimeDirector;
    }

    if (body.paymentMethod !== undefined) {
      employeeUpdate.payment_method = body.paymentMethod;
      if (body.paymentMethod === "bank") {
        employeeUpdate.bank_name = body.bankName ?? null;
        employeeUpdate.bank_account_no = body.bankAccountNo ?? null;
        employeeUpdate.mobile_money_provider = null;
        employeeUpdate.mobile_money_no = null;
      } else if (body.paymentMethod === "mobile_money") {
        employeeUpdate.mobile_money_provider = body.mobileMoneyProvider ?? null;
        employeeUpdate.mobile_money_no = body.mobileMoneyNo ?? null;
        employeeUpdate.bank_name = null;
        employeeUpdate.bank_account_no = null;
      }
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update(employeeUpdate)
      .eq("company_id", context.companyId)
      .eq("id", employeeId);

    if (updateError) {
      return fail("Failed to update employee", 500, updateError.message);
    }

    if (body.basicSalary !== undefined || body.contractType !== undefined || body.hireDate !== undefined) {
      const { data: latestContract, error: latestError } = await supabase
        .from("employee_contracts")
        .select("id, basic_salary, contract_type, effective_from")
        .eq("company_id", context.companyId)
        .eq("employee_id", employeeId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        return fail("Failed to load current contract", 500, latestError.message);
      }

      const effectiveFrom = body.hireDate ?? latestContract?.effective_from ?? new Date().toISOString().slice(0, 10);
      const nextBasicSalary = Number(body.basicSalary ?? latestContract?.basic_salary ?? 0);
      const nextContractType = body.contractType ?? latestContract?.contract_type ?? "permanent";

      const { error: contractInsertError } = await supabase.from("employee_contracts").insert({
        company_id: context.companyId,
        employee_id: employeeId,
        contract_type: nextContractType,
        effective_from: effectiveFrom,
        basic_salary: nextBasicSalary,
        salary_frequency: "monthly",
        currency_code: "TZS",
        metadata: {
          source: "employee_edit",
        },
      });

      if (contractInsertError) {
        return fail("Failed to create contract version", 500, contractInsertError.message);
      }
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "employee.updated",
      entityType: "employee",
      entityId: employeeId,
      metadata: {
        fieldsUpdated: Object.keys(body),
      },
    });

    return ok({ id: employeeId });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
