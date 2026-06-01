"use client";

import { Vote } from "lucide-react";
import { VotePanel } from "@/components/dashboard/tools/vote-panel";
import { GlassPanel } from "@/components/ui/glass-panel";

export default function VotePage() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Vote className="h-3.5 w-3.5" />
          Vote
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">投票工具</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">创建投票、查看结果，并管理投票状态。</p>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <VotePanel />
      </GlassPanel>
    </div>
  );
}
