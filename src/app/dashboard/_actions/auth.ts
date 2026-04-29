"use server";

import { requireDashboardAccess } from "../_lib/auth";

export async function getLogoutInfo() {
  const { logout } = await requireDashboardAccess("/dashboard");
  return logout;
}
