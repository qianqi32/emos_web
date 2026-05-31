"use client";

import { Film, Music, Radio } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { LivePanel } from "@/app/user/media/live-panel";
import { MoviesPanel } from "@/app/user/media/movies-panel";
import { MusicPanel } from "@/app/user/media/music-panel";

type MediaTab = "video" | "live" | "music";

function readTab(value: string | null): MediaTab {
  return value === "live" || value === "music" ? value : "video";
}

export default function MediaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = readTab(searchParams.get("tab"));

  const tabs = useMemo(
    () => [
      { key: "video" as const, label: "影视", icon: Film },
      { key: "live" as const, label: "直播", icon: Radio },
      { key: "music" as const, label: "音乐", icon: Music },
    ],
    []
  );

  function setActiveTab(tab: MediaTab) {
    const params = new URLSearchParams(searchParams.toString());

    if (tab === "video") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Film className="h-3.5 w-3.5" />
          Media Library
        </div>
        <div className="mt-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">媒体管理</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            统一管理影视、直播与音乐服务。影视列表保留搜索和资源筛选，直播直接浏览频道与播放源。
          </p>
        </div>
      </GlassPanel>

      <GlassPanel className="p-2">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={
                  isActive
                    ? "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background"
                    : "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {activeTab === "video" ? <MoviesPanel /> : null}
      {activeTab === "live" ? <LivePanel /> : null}
      {activeTab === "music" ? <MusicPanel /> : null}
    </div>
  );
}
