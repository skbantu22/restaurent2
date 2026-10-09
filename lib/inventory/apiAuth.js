import { isAuthenticated } from "@/lib/auth.server";
import { response } from "@/lib/helperfunction";

// Phase 2 authorization policy for the inventory module:
// viewing and modifying inventory data is available to admin + manager.
// "staff" (POS cashiers) are intentionally excluded until a future
// phase explicitly opens up narrower, POS-scoped actions (e.g. a
// dedicated "stock_manager" role, per the audit's recommendation).
export const INVENTORY_ROLES = ["admin", "manager"];

/**
 * Guards an inventory API route. Returns { auth } on success, or
 * { error } (a ready-to-return NextResponse) on failure.
 *
 * Usage:
 *   const { auth, error } = await guardInventoryRequest();
 *   if (error) return error;
 */
export async function guardInventoryRequest(roles = INVENTORY_ROLES) {
  const auth = await isAuthenticated(roles);

  if (!auth.isAuth) {
    return {
      auth,
      error: response(false, 401, "Unauthorized. Admin or manager access required."),
    };
  }

  return { auth, error: null };
}
