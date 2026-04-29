"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@cloudflare/kumo/components/sidebar";
import { Text } from "@cloudflare/kumo/components/text";
import type { AuthenticatedSessionResult } from "@iamkaf/uriel";

export type LogoutForm = {
  action: string;
  body: string;
};

export type DashboardShellProps = {
  user: AuthenticatedSessionResult["user"];
  logout: LogoutForm;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { label: "Suites", href: "/dashboard/suites" },
  { label: "Runs", href: "/dashboard/runs" },
  { label: "Models", href: "/dashboard/models" },
  { label: "Samples", href: "/dashboard/samples" },
  { label: "Quality", href: "/dashboard/quality" },
];

function parseReturnTo(body: string): string {
  return new URLSearchParams(body).get("returnTo") ?? "/";
}

function LogoutButton({ logout }: { logout: LogoutForm }) {
  return (
    <button
      className="w-full rounded-lg border border-kumo-hairline bg-kumo-base px-3 py-2 text-sm transition hover:bg-kumo-canvas"
      onClick={() => {
        const form = document.createElement("form");
        form.method = "post";
        form.action = logout.action;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "returnTo";
        input.value = parseReturnTo(logout.body);
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      }}
    >
      Log out
    </button>
  );
}

export function DashboardShell({ user, logout, children }: DashboardShellProps) {
  const pathname = usePathname() ?? "";

  return (
    <SidebarProvider defaultOpen variant="sidebar" collapsible="none">
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-kumo-hairline">
          <SidebarHeader className="px-4 py-5">
            <div className="truncate">
              <Text as="h1" variant="heading3">MCEval</Text>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          href={item.href}
                          active={active}
                          tooltip={item.label}
                        >
                          {item.label}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-kumo-hairline p-4">
            <div className="space-y-3">
              <div className="truncate">
                <Text variant="secondary">{user.displayName}</Text>
              </div>
              <LogoutButton logout={logout} />
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto px-8 py-6 lg:px-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
