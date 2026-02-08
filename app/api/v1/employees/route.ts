import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { validateEmployeeInput, type EmployeeUpsertInput } from "@/lib/validation/employee";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

type EmployeeRow = {
  id: string;
  employee_no: string | null;
  first_name: string;
  last_name: string;
  work_email: string | null;
  phone: string | null;
  hire_date: string;
  employment_type: string;
  tax_residency: string;
  is_primary_employment: boolean;
  is_non_full_time_director: boolean;
  payment_method: string;
  metadata: Record<string, unknown>;
};

type ContractRow = {
  employee_id: string;
  basic_salary: number | string;
  contract_type: string;
  effective_from: string;
};

export async function GET() {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const supabase = await createSupabaseServerClient();

    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select(
        "id, employee_no, first_name, last_name, work_email, phone, hire_date, employment_type, tax_residency, is_primary_employment, is_non_full_time_director, payment_method, metadata",
      )
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false });

    if (employeesError) {
      return fail("Failed to load employees", 500, employeesError.message);
    }

    const employeeIds = ((employees ?? []) as EmployeeRow[]).map((employee) => employee.id);

    let contractMap = new Map<string, ContractRow>();

    if (employeeIds.length) {
      const { data: contracts, error: contractsError } = await supabase
        .from("employee_contracts")
        .select("employee_id, basic_salary, contract_type, effective_from")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds)
        .order("effective_from", { ascending: false });

      if (contractsError) {
        return fail("Failed to load employee contracts", 500, contractsError.message);
      }

      contractMap = ((contracts ?? []) as ContractRow[]).reduce((map, contract) => {
        if (!map.has(contract.employee_id)) {
          map.set(contract.employee_id, contract);
        }
        return map;
      }, new Map<string, ContractRow>());
    }

    const response = ((employees ?? []) as EmployeeRow[]).map((employee: EmployeeRow) => {
      const contract = contractMap.get(employee.id);
      return {
        id: employee.id,
        employeeNo: employee.employee_no,
        firstName: employee.first_name,
        lastName: employee.last_name,
        fullName: `${employee.first_name} ${employee.last_name}`,
        workEmail: employee.work_email,
        phone: employee.phone,
        hireDate: employee.hire_date,
        employmentType: employee.employment_type,
        taxResidency: employee.tax_residency,
        isPrimaryEmployment: employee.is_primary_employment,
        isNonFullTimeDirector: employee.is_non_full_time_director,
        paymentMethod: employee.payment_method,
        department: String(employee.metadata?.department ?? ""),
        jobTitle: String(employee.metadata?.job_title ?? ""),
        basicSalary: Number(contract?.basic_salary ?? 0),
        contractType: contract?.contract_type ?? "permanent",
      };
    });

    return ok(response);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const supabase = await createSupabaseServerClient();

    const body = (await request.json()) as EmployeeUpsertInput;
    const endpoint = "/api/v1/employees";
    const idempotencyResolution = await resolveIdempotencyRequest({
      supabase,
      companyId: context.companyId,
      actorUserId: context.userId,
      endpoint,
      key: readIdempotencyKey(request),
      requestHash: hashIdempotencyPayload(body),
    });

    if (idempotencyResolution.mode === "replay") {
      return Response.json(idempotencyResolution.responseBody, { status: idempotencyResolution.responseCode });
    }

    if (idempotencyResolution.mode === "conflict") {
      return fail("Idempotency key conflict: payload differs from original request", 409);
    }

    if (idempotencyResolution.mode === "in_progress") {
      return fail("Duplicate request is currently processing", 409);
    }

    async function failWithIdempotency(message: string, status: number, details?: unknown) {
      if (idempotencyResolution.mode === "acquired") {
        await finalizeIdempotencyFailure({
          supabase,
          companyId: context.companyId,
          endpoint,
          key: idempotencyResolution.key,
          responseCode: status,
          errorBody: {
            error: {
              message,
              details,
            },
          },
        });
      }

      if (status >= 500) {
        await logApiFailure({
          supabase,
          companyId: context.companyId,
          actorUserId: context.userId,
          route: endpoint,
          method: "POST",
          category: "api_failure",
          statusCode: status,
          message,
          details,
        });
      }

      return fail(message, status, details);
    }

    const validation = validateEmployeeInput(body, "create");

    if (!validation.valid) {
      return failWithIdempotency("Invalid employee payload", 422, validation.errors);
    }

    const employeePayload: Record<string, unknown> = {
      employee_no: body.employeeNo ?? null,
      first_name: body.firstName?.trim(),
      last_name: body.lastName?.trim(),
      work_email: body.workEmail ?? null,
      phone: body.phone ?? null,
      hire_date: body.hireDate,
      employment_type: body.employmentType ?? "permanent",
      tax_residency: body.taxResidency ?? "resident",
      is_primary_employment: body.isPrimaryEmployment ?? true,
      is_non_full_time_director: body.isNonFullTimeDirector ?? false,
      payment_method: body.paymentMethod ?? "bank",
      bank_name: body.paymentMethod === "bank" ? body.bankName ?? null : null,
      bank_account_no: body.paymentMethod === "bank" ? body.bankAccountNo ?? null : null,
      mobile_money_provider: body.paymentMethod === "mobile_money" ? body.mobileMoneyProvider ?? null : null,
      mobile_money_no: body.paymentMethod === "mobile_money" ? body.mobileMoneyNo ?? null : null,
      metadata: {
        department: body.department ?? null,
        job_title: body.jobTitle ?? null,
      },
    };

    const contractPayload: Record<string, unknown> = {
      contract_type: body.contractType ?? "permanent",
      effective_from: body.hireDate,
      basic_salary: Number(body.basicSalary ?? 0),
      salary_frequency: "monthly",
      currency_code: "TZS",
      metadata: {
        source: "employee_onboarding",
      },
    };

    const { data: employeeId, error: transactionError } = await supabase.rpc("tx_create_employee_with_contract", {
      p_company_id: context.companyId,
      p_actor_user_id: context.userId,
      p_employee: employeePayload,
      p_contract: contractPayload,
    });

    if (transactionError || !employeeId) {
      return failWithIdempotency("Failed to create employee", 500, transactionError?.message);
    }

    const responseBody = {
      data: {
        id: String(employeeId),
      },
    };

    if (idempotencyResolution.mode === "acquired") {
      await finalizeIdempotencySuccess({
        supabase,
        companyId: context.companyId,
        endpoint,
        key: idempotencyResolution.key,
        responseCode: 201,
        responseBody,
      });
    }

    return ok(
      {
        id: String(employeeId),
      },
      201,
    );
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/employees",
      method: "POST",
      category: "auth_failure",
      statusCode: 401,
      message: error instanceof Error ? error.message : "Unauthorized",
      details: {
        phase: "require_permission_or_request_handling",
      },
    });
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
