"use client";

import { Copy, Music } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useUserConsole } from "@/components/dashboard/user-console-context";

export function MusicPanel() {
  const { user } = useUserConsole();
  const musicServer = user.server_music;

  async function handleCopy() {
    if (!musicServer) {
      return;
    }

    await navigator.clipboard.writeText(musicServer);
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Music className="h-4 w-4 text-muted-foreground" />
          音乐服务
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          当前 API 文档只提供音乐收藏、评分、同步等操作接口，暂未提供歌曲、专辑或歌单的浏览列表接口。这里先展示音乐服务入口，避免做无法真实加载内容的空列表。
        </p>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
          <div className="text-xs text-muted-foreground">音乐服务地址</div>
          {musicServer ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="break-all font-mono text-sm text-foreground">{musicServer}</div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40"
              >
                <Copy className="h-4 w-4" />
                复制
              </button>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">当前账号未开通或未返回音乐服务地址。</div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
