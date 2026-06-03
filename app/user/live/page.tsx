import { Radio } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { LivePanel } from "@/app/user/media/live-panel";

export default function LivePage() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Radio className="h-3.5 w-3.5" />
          Live Center
        </div>
        <div className="mt-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">直播管理</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            浏览直播库、频道和媒体源；在权限允许时创建或编辑频道，维护直播源并支持批量更新。
          </p>
        </div>
      </GlassPanel>

      <LivePanel />
    </div>
  );
}
