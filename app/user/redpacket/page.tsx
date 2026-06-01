"use client";

import { Gift } from "lucide-react";
import { RedPacketPanel } from "@/components/dashboard/tools/redpacket-panel";
import { GlassPanel } from "@/components/ui/glass-panel";

export default function RedPacketPage() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Gift className="h-3.5 w-3.5" />
          Red Packet
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">红包工具</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">创建固定、随机、口令或私人红包，支持资源 URL 与临时文件上传。</p>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <RedPacketPanel />
      </GlassPanel>
    </div>
  );
}
