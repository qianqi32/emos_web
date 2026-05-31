"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { formatBytes } from "@/components/dashboard/format";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { RawPayloadPanel } from "@/components/dashboard/raw-payload-panel";
import { ServicesPanel } from "@/components/dashboard/services-panel";
import { SignInCard } from "@/components/dashboard/sign-in-card";
import { UserHero } from "@/components/dashboard/user-hero";
import { MetricCard } from "@/components/ui/metric-card";
import type { UserProfile } from "@/lib/api/types";

interface DashboardViewProps {
  token: string;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onLogout: () => void;
}

export function DashboardView({ token, user, onUserChange, onLogout }: DashboardViewProps) {
  const statusCards = useMemo(
    () => [
      { label: "Carrot", value: String(user.carrot), helper: "当前萝卜余额" },
      { label: "Upload", value: formatBytes(user.size_upload), helper: user.is_can_upload ? "允许上传" : "暂无上传权限" },
      { label: "Invite", value: String(user.invite_remaining), helper: "剩余邀请名额" },
      { label: "Watchlist", value: String(user.slot_remaining), helper: "剩余片单卡槽" }
    ],
    [user]
  );

  return (
    <DashboardShell user={user} onLogout={onLogout}>
      <UserHero token={token} user={user} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {statusCards.map((card) => <MetricCard key={card.label} label={card.label} value={card.value} helper={card.helper} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:gap-5">
        <SignInCard token={token} user={user} onUserChange={onUserChange} />
        <QuickActionsCard />
      </div>

      <ServicesPanel user={user} />

      <RawPayloadPanel user={user} />
    </DashboardShell>
  );
}
