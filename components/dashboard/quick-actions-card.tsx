"use client";

import Link from "next/link";
import { Gift, History, PartyPopper, Send, Ticket, Vote } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ToolDialog } from "@/components/dashboard/tools/tool-dialog";
import { LotteryPanel } from "@/components/dashboard/tools/lottery-panel";
import { RecordRequestPanel } from "@/components/dashboard/tools/record-request-panel";
import { RedPacketPanel } from "@/components/dashboard/tools/redpacket-panel";
import { TransferPanel } from "@/components/dashboard/tools/transfer-panel";
import { VotePanel } from "@/components/dashboard/tools/vote-panel";

type ToolKey = "transfer" | "redpacket" | "lottery" | "vote" | "record";

const quickActions: Array<
  | { label: string; icon: typeof Send; href: string }
  | { label: string; icon: typeof Send; tool: ToolKey }
> = [
  { label: "转赠萝卜", icon: Send, tool: "transfer" },
  { label: "邀请用户", icon: Ticket, href: "/user/invite" },
  { label: "红包工具", icon: Gift, tool: "redpacket" },
  { label: "抽奖工具", icon: PartyPopper, tool: "lottery" },
  { label: "投票工具", icon: Vote, tool: "vote" },
  { label: "请求记录", icon: History, tool: "record" }
];

export function QuickActionsCard() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  function close() {
    setActiveTool(null);
  }

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Gift className="h-3.5 w-3.5" />
        Quick Actions
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight">快捷操作</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const className = "flex min-h-14 items-center justify-between rounded-2xl border border-border/50 bg-muted/15 px-4 text-left text-sm font-semibold transition-colors hover:bg-muted/35";

          return "href" in action ? (
            <Link key={action.label} href={action.href} className={className}>
              {action.label}
              <Icon className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <button key={action.label} type="button" onClick={() => setActiveTool(action.tool)} className={className}>
              {action.label}
              <Icon className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <ToolDialog open={activeTool === "transfer"} title="转赠萝卜" maxWidthClassName="max-w-md" onClose={close}>
        <TransferPanel />
      </ToolDialog>
      <ToolDialog open={activeTool === "redpacket"} title="红包工具" maxWidthClassName="max-w-3xl" onClose={close}>
        <RedPacketPanel />
      </ToolDialog>
      <ToolDialog open={activeTool === "lottery"} title="抽奖工具" maxWidthClassName="max-w-4xl" onClose={close}>
        <LotteryPanel />
      </ToolDialog>
      <ToolDialog open={activeTool === "vote"} title="投票工具" maxWidthClassName="max-w-3xl" onClose={close}>
        <VotePanel />
      </ToolDialog>
      <ToolDialog open={activeTool === "record"} title="播放请求记录" maxWidthClassName="max-w-2xl" onClose={close}>
        <RecordRequestPanel />
      </ToolDialog>
    </GlassPanel>
  );
}
