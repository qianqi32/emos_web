"use client";

import { useMemo } from "react";
import { formatBytes } from "@/components/dashboard/format";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { RawPayloadPanel } from "@/components/dashboard/raw-payload-panel";
import { ServicesPanel } from "@/components/dashboard/services-panel";
import { SignInCard } from "@/components/dashboard/sign-in-card";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { UserHero } from "@/components/dashboard/user-hero";
import { MetricCard } from "@/components/ui/metric-card";

export default function UserHomePage() {
  const { token, user, setUser } = useUserConsole();
  const statusCards = useMemo(
    () => [
      { label: "Carrot", value: String(user.carrot), helper: "当前萝卜余额", href: "/user/community?tab=carrot" },
      { label: "Upload", value: formatBytes(user.size_upload), helper: user.is_can_upload ? "允许上传" : "暂无上传权限" },
      { label: "Invite", value: String(user.invite_remaining), helper: "剩余邀请名额" },
      { label: "Watchlist", value: String(user.slot_remaining), helper: "剩余片单卡槽" }
    ],
    [user]
  );

  return (
    <>
      <UserHero token={token} user={user} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {statusCards.map((card) => <MetricCard key={card.label} label={card.label} value={card.value} helper={card.helper} href={card.href} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:gap-5">
        <SignInCard token={token} user={user} onUserChange={setUser} />
        <QuickActionsCard />
      </div>

      <ServicesPanel user={user} />

      <RawPayloadPanel user={user} />
    </>
  );
}
