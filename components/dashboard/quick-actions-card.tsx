import Link from "next/link";
import { Gift, History, PartyPopper, Send, Ticket, Vote } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";

const quickActions = [
  { label: "转赠萝卜", icon: Send },
  { label: "邀请用户", icon: Ticket, href: "/user/invite" },
  { label: "红包工具", icon: Gift },
  { label: "抽奖工具", icon: PartyPopper },
  { label: "投票工具", icon: Vote },
  { label: "请求记录", icon: History }
];

export function QuickActionsCard() {
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

          return action.href ? (
            <Link key={action.label} href={action.href} className={className}>
              {action.label}
              <Icon className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <button key={action.label} type="button" className={className}>
              {action.label}
              <Icon className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </GlassPanel>
  );
}
