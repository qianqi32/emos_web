"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const REALMS = [
  { name: "凡人期", icon: "👤", description: "凡尘俗世，尚未踏入修仙之路", levels: [{ name: "凡人", min: 0, max: 9 }] },
  { name: "练气期", icon: "💨", description: "炼气九重，引气入体", levels: Array.from({ length: 9 }, (_, i) => ({ name: `练气期${["一", "二", "三", "四", "五", "六", "七", "八", "九"][i]}层`, min: 10 + i * 10, max: 19 + i * 10 })) },
  { name: "筑基期", icon: "🏛️", description: "筑基四境，奠定道基", levels: [{ name: "筑基初期", min: 100, max: 149 }, { name: "筑基中期", min: 150, max: 299 }, { name: "筑基后期", min: 300, max: 599 }, { name: "筑基圆满", min: 600, max: 999 }] },
  { name: "结丹期", icon: "💎", description: "结丹四境，凝气成丹", levels: [{ name: "结丹初期", min: 1000, max: 1999 }, { name: "结丹中期", min: 2000, max: 3499 }, { name: "结丹后期", min: 3500, max: 5999 }, { name: "结丹圆满", min: 6000, max: 9999 }] },
  { name: "元婴期", icon: "👶", description: "元婴四境，丹破婴生", levels: [{ name: "元婴初期", min: 10000, max: 19999 }, { name: "元婴中期", min: 20000, max: 34999 }, { name: "元婴后期", min: 35000, max: 59999 }, { name: "元婴圆满", min: 60000, max: 99999 }] },
  { name: "化神期", icon: "✨", description: "上五境之首，元神化形", levels: [{ name: "化神", min: 100000, max: 499999 }] },
  { name: "炼虚期", icon: "🌌", description: "炼虚合道，虚实相生", levels: [{ name: "炼虚", min: 500000, max: 999999 }] },
  { name: "合体期", icon: "🔗", description: "合体归真，天人合一", levels: [{ name: "合体", min: 1000000, max: 9999999 }] },
  { name: "大乘期", icon: "🌟", description: "大乘圆满，半步真仙", levels: [{ name: "大乘", min: 10000000, max: 99999999 }] },
  { name: "真仙期", icon: "👑", description: "飞升真仙，万古不灭", levels: [{ name: "真仙", min: 100000000, max: Infinity }] }
];

interface RealmLevel {
  name: string;
  min: number;
  max: number;
}

function getCarrot(value: unknown) {
  const carrot = Number(value ?? 0);
  return Number.isFinite(carrot) && carrot > 0 ? carrot : 0;
}

function getCurrentRealm(carrot: number) {
  for (const realm of REALMS) {
    for (const level of realm.levels) {
      if (carrot >= level.min && carrot <= level.max) {
        return { ...realm, level };
      }
    }
  }
  return { ...REALMS[0], level: REALMS[0].levels[0] };
}

function getNextLevel(current: RealmLevel) {
  const levels = REALMS.flatMap((realm) => realm.levels.map((level) => ({ realm, level })));
  const index = levels.findIndex((item) => item.level.name === current.name);
  return index >= 0 ? levels[index + 1] ?? null : null;
}

function getProgress(carrot: number, level: RealmLevel) {
  if (level.max === Infinity) return 100;
  const range = level.max - level.min + 1;
  const current = carrot - level.min;
  return Math.min(Math.max(Math.floor((current / range) * 100), 0), 100);
}

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

export default function RealmPage() {
  const { user } = useUserConsole();
  const carrot = getCarrot(user.carrot);
  const current = getCurrentRealm(carrot);
  const next = getNextLevel(current.level);
  const progress = getProgress(carrot, current.level);
  const nextRemaining = next ? Math.max(next.level.min - carrot, 0) : 0;

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="overflow-hidden p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Cultivation Realm
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="text-6xl leading-none">{current.icon}</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{current.level.name}</h1>
            <p className="mt-3 text-base text-muted-foreground">{current.name} · {current.description}</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted/60">
              <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatNumber(current.level.min)} 🥕</span>
              <span>{progress}%</span>
              <span>{current.level.max === Infinity ? "∞" : formatNumber(current.level.max)} 🥕</span>
            </div>
          </div>
          <div className="grid gap-3">
            <MetricCard label="当前萝卜" value={formatNumber(carrot)} helper="萝卜越多，境界越高" />
            <MetricCard label="下一境界" value={next?.level.name ?? "已达巅峰"} helper={next ? `还需 ${formatNumber(nextRemaining)} 🥕` : "万古不灭真仙之境"} />
            <button type="button" onClick={() => window.location.reload()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40">
              <RefreshCw className="h-4 w-4" />刷新状态
            </button>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">境界体系</h2>
        <p className="mt-2 text-sm text-muted-foreground">积累萝卜，突破境界，飞升成仙。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {REALMS.map((realm) => (
            <div key={realm.name} className="rounded-2xl border border-border/50 bg-background/30 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{realm.icon}</span>
                <div>
                  <div className="font-semibold">{realm.name}</div>
                  <div className="text-xs text-muted-foreground">{realm.description}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {realm.levels.map((level) => (
                  <div key={level.name} className={`flex justify-between rounded-xl px-2 py-1 ${level.name === current.level.name ? "bg-foreground text-background" : "bg-muted/25"}`}>
                    <span>{level.name}</span>
                    <span>{formatNumber(level.min)} - {level.max === Infinity ? "∞" : formatNumber(level.max)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
