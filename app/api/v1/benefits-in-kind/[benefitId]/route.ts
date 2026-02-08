import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import { validateBenefitInput, type BenefitUpsertInput } from "@/lib/validation/benefits-in-kind";

export async function PATCH(request: Request, { params }: { params: Promise<{ benefitId: string }> }) {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const { benefitId } = await params;
    const supabase = await createSupabaseServerClient();

    const body = (await request.json()) as BenefitUpsertInput;
    const validation = validateBenefitInput(body, "update");

    if (!validation.valid) {
      return fail("Invalid benefit payload", 422, validation.errors);
    }

    const payload: Record<string, unknown> = {};

    if (body.employeeId !== undefined) payload.employee_id = body.employeeId;
    if (body.benefitType !== undefined) payload.benefit_type = body.benefitType;
    if (body.effectiveFrom !== undefined) payload.effective_from = body.effectiveFrom;
    if (body.effectiveTo !== undefined) payload.effective_to = body.effectiveTo;
    if (body.amount !== undefined) payload.amount = body.amount;
    if (body.metadata !== undefined) payload.metadata = body.metadata;

    const { error } = await supabase
      .from("employee_benefits_in_kind")
      .update(payload)
      .eq("company_id", context.companyId)
      .eq("id", benefitId);

    if (error) {
      return fail("Failed to update benefit in kind", 500, error.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "bik.updated",
      entityType: "employee_benefit_in_kind",
      entityId: benefitId,
      metadata: {
        fieldsUpdated: Object.keys(payload),
      },
    });

    return ok({ id: benefitId });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ benefitId: string }> }) {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const { benefitId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("employee_benefits_in_kind")
      .delete()
      .eq("company_id", context.companyId)
      .eq("id", benefitId)
      .select("id");

    if (error) {
      return fail("Failed to delete benefit in kind", 500, error.message);
    }

    if (!data?.length) {
      return fail("Benefit in kind record not found", 404);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "bik.deleted",
      entityType: "employee_benefit_in_kind",
      entityId: benefitId,
      metadata: {
        deleted: true,
      },
    });

    return ok({ id: benefitId });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
