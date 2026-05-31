"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { UserProfile } from "@/lib/api/types";

interface DashboardShellProps {
  user: UserProfile;
  onLogout: () => void;
  children: React.ReactNode;
}

export function DashboardShell({ user, onLogout, children }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-5 lg:grid-cols-[280px_1fr] lg:gap-6">
      <div className="sticky top-3 z-30 flex items-center justify-between gap-3 rounded-full border border-border/60 bg-background/75 px-3 py-2 backdrop-blur-xl lg:hidden">
        <AppTopBar compact />
        <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background">
          <Menu className="h-4 w-4" />
          菜单
        </button>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-md lg:hidden">
          <button type="button" aria-label="关闭菜单" className="absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full rounded-t-[2rem] border border-border/60 bg-background/95 p-5 shadow-2xl">
            <DashboardNav user={user} onLogout={onLogout} onClose={() => setDrawerOpen(false)} mobile />
          </div>
        </div>
      ) : null}

      <aside className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-7rem)]">
        <GlassPanel className="flex h-full flex-col p-5">
          <DashboardNav user={user} onLogout={onLogout} />
        </GlassPanel>
      </aside>

      <section className="space-y-4 lg:space-y-6">{children}</section>
    </div>
  );
}
