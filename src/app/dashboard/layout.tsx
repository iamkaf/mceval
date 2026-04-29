import { requireDashboardAccess } from "./_lib/auth";
import { DashboardShell } from "./_components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth, logout } = await requireDashboardAccess("/dashboard");

  return (
    <DashboardShell
      user={auth.result.user}
      logout={logout}
    >
      {children}
    </DashboardShell>
  );
}
