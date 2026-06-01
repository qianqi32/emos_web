"use client";

import { PartyPopper } from "lucide-react";
import { LotteryPanel } from "@/components/dashboard/tools/lottery-panel";
import { GlassPanel } from "@/components/ui/glass-panel";

export default function LotteryPage() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <PartyPopper className="h-3.5 w-3.5" />
          Lottery
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">抽奖工具</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">创建抽奖、查看中奖列表，并管理未开奖活动。</p>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <LotteryPanel />
      </GlassPanel>
    </div>
  );
}
