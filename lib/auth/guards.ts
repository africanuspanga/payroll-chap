import { hasPermission, type Permission } from "@/lib/auth/roles";
import { getRequiredUserContext } from "@/lib/auth/user-context";

export async function requirePermission(permission: Permission, nextPath = "/dashboard") {
  const context = await getRequiredUserContext(nextPath);

  if (!hasPermission(context.role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }

  return context;
}
