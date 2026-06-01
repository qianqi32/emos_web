"use client";

import Link from "next/link";
import { Film, Gift, History, PartyPopper, Send, Sparkles, Ticket, Vote } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ToolDialog } from "@/components/dashboard/tools/tool-dialog";
import { RecordRequestPanel } from "@/components/dashboard/tools/record-request-panel";
import { TransferPanel } from "@/components/dashboard/tools/transfer-panel";
import { useUserConsole } from "@/components/dashboard/user-console-context";

type ToolKey = "transfer" | "record" | "realm";

type CultivationLevel = {
  realmName: string;
  description: string;
  levelName: string;
  min: number;
  max: number;
};

const cultivationLevels: CultivationLevel[] = [
  { realmName: "凡人期", description: "凡尘俗世，尚未踏入修仙之路", levelName: "凡人", min: 0, max: 9 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期一层", min: 10, max: 19 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期二层", min: 20, max: 29 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期三层", min: 30, max: 39 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期四层", min: 40, max: 49 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期五层", min: 50, max: 59 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期六层", min: 60, max: 69 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期七层", min: 70, max: 79 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期八层", min: 80, max: 89 },
  { realmName: "练气期", description: "炼气九重，引气入体", levelName: "练气期九层", min: 90, max: 99 },
  { realmName: "筑基期", description: "筑基四境，奠定道基", levelName: "筑基初期", min: 100, max: 149 },
  { realmName: "筑基期", description: "筑基四境，奠定道基", levelName: "筑基中期", min: 150, max: 299 },
  { realmName: "筑基期", description: "筑基四境，奠定道基", levelName: "筑基后期", min: 300, max: 599 },
  { realmName: "筑基期", description: "筑基四境，奠定道基", levelName: "筑基圆满", min: 600, max: 999 },
  { realmName: "结丹期", description: "结丹四境，凝气成丹", levelName: "结丹初期", min: 1000, max: 1999 },
  { realmName: "结丹期", description: "结丹四境，凝气成丹", levelName: "结丹中期", min: 2000, max: 3499 },
  { realmName: "结丹期", description: "结丹四境，凝气成丹", levelName: "结丹后期", min: 3500, max: 5999 },
  { realmName: "结丹期", description: "结丹四境，凝气成丹", levelName: "结丹圆满", min: 6000, max: 9999 },
  { realmName: "元婴期", description: "元婴四境，丹破婴生", levelName: "元婴初期", min: 10000, max: 19999 },
  { realmName: "元婴期", description: "元婴四境，丹破婴生", levelName: "元婴中期", min: 20000, max: 34999 },
  { realmName: "元婴期", description: "元婴四境，丹破婴生", levelName: "元婴后期", min: 35000, max: 59999 },
  { realmName: "元婴期", description: "元婴四境，丹破婴生", levelName: "元婴圆满", min: 60000, max: 99999 },
  { realmName: "化神期", description: "上五境之首，元神化形", levelName: "化神", min: 100000, max: 499999 },
  { realmName: "炼虚期", description: "炼虚合道，虚实相生", levelName: "炼虚", min: 500000, max: 999999 },
  { realmName: "合体期", description: "合体归真，天人合一", levelName: "合体", min: 1000000, max: 9999999 },
  { realmName: "大乘期", description: "大乘圆满，半步真仙", levelName: "大乘", min: 10000000, max: 99999999 },
  { realmName: "真仙期", description: "飞升真仙，万古不灭", levelName: "真仙", min: 100000000, max: Infinity }
];

const quickActions: Array<
  | { label: string; icon: typeof Send; href: string }
  | { label: string; icon: typeof Send; tool: ToolKey }
> = [
  { label: "转赠萝卜", icon: Send, tool: "transfer" },
  { label: "邀请用户", icon: Ticket, href: "/user/invite" },
  { label: "红包工具", icon: Gift, href: "/user/redpacket" },
  { label: "抽奖工具", icon: PartyPopper, href: "/user/lottery" },
  { label: "投票工具", icon: Vote, href: "/user/vote" },
  { label: "请求记录", icon: History, tool: "record" },
  { label: "观影历史", icon: Film, href: "/user/history" },
  { label: "修仙境界", icon: Sparkles, tool: "realm" }
];

function getCultivationRealm(carrot: number) {
  const safeCarrot = Number.isFinite(carrot) && carrot > 0 ? carrot : 0;
  const level = cultivationLevels.find((item) => safeCarrot >= item.min && safeCarrot <= item.max) || cultivationLevels[0];
  const next = cultivationLevels.find((item) => item.min > safeCarrot) || null;
  const progress = level.max === Infinity ? 100 : Math.min(Math.floor(((safeCarrot - level.min) / (level.max - level.min + 1)) * 100), 100);

  return { level, next, progress, carrot: safeCarrot };
}

function RealmPanel() {
  const { user } = useUserConsole();
  const realm = getCultivationRealm(user?.carrot ?? 0);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border/60 bg-muted/20 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cultivation Realm</div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{realm.level.levelName}</div>
            <div className="mt-1 text-sm text-muted-foreground">{realm.level.realmName} · {realm.level.description}</div>
          </div>
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>当前萝卜 {realm.carrot}</span>
            <span>{realm.progress}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${realm.progress}%` }} />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          {realm.next ? <>下一境界 <span className="font-semibold text-foreground">{realm.next.levelName}</span>，还需 <span className="font-mono text-foreground">{realm.next.min - realm.carrot}</span> 萝卜。</> : "已达巅峰：万古不灭真仙之境。"}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">多多签到、上传资源，积累萝卜提升境界。</p>
    </div>
  );
}

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
      <ToolDialog open={activeTool === "record"} title="播放请求记录" maxWidthClassName="max-w-2xl" onClose={close}>
        <RecordRequestPanel />
      </ToolDialog>
      <ToolDialog open={activeTool === "realm"} title="修仙境界" maxWidthClassName="max-w-md" onClose={close}>
        <RealmPanel />
      </ToolDialog>
    </GlassPanel>
  );
}
