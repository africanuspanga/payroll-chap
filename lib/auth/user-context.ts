import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appRoles, type AppRole } from "@/lib/auth/roles";

export type UserContext = {
  userId: string;
  email: string | null;
  companyId: string;
  role: AppRole;
};

export async function getRequiredUserContext(nextPath = "/dashboard"): Promise<UserContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  const { data, error } = await supabase
    .from("company_memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No active company membership found for current user");
  }

  const role = data.role;
  if (!appRoles.includes(role as AppRole)) {
    throw new Error(`Unsupported role in membership: ${String(role)}`);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    companyId: data.company_id,
    role: role as AppRole,
  };
}
