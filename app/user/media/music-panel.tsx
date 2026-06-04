"use client";

import { Copy, ExternalLink, Music } from "lucide-react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { useState } from "react";

export function MusicPanel() {
  const { user } = useUserConsole();
  const musicServer = user.server_music;
  const [message, setMessage] = useState("");

  async function handleCopy() {
    if (!musicServer) return;
    await navigator.clipboard.writeText(musicServer);
    setMessage("已复制音乐服务地址");
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={message} onClose={() => setMessage("")} />

      {musicServer ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Music className="h-4 w-4 text-muted-foreground" />
            音乐服务
          </div>
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
        </GlassPanel>
      ) : null}

      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Music className="h-4 w-4 text-muted-foreground" />
          音乐功能
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          音乐库浏览与歌单歌曲接口暂未补全，不过你可以先创建音乐片单玩玩。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/user/watchlist" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90">
            <ExternalLink className="h-4 w-4" />
            前往片单列表
          </Link>
          <span className="inline-flex h-10 items-center rounded-full border border-border/70 px-4 text-xs text-muted-foreground">
            创建片单时选择「音乐片单」
          </span>
        </div>
      </GlassPanel>
    </div>
  );
}
