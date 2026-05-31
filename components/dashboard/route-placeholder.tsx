import { GlassPanel } from "@/components/ui/glass-panel";

interface RoutePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function RoutePlaceholder({ eyebrow, title, description }: RoutePlaceholderProps) {
  return (
    <GlassPanel className="p-5 sm:p-6 lg:p-8">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-6 rounded-2xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">该模块已完成路由占位，下一阶段接入对应 EMOS API。</div>
    </GlassPanel>
  );
}
