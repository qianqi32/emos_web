"use client";

import { ArrowUpRight, Loader2, Trophy, Play, Calendar, Coins } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  getRankCarrot,
  getRankUpload,
  getRankPlaying,
  getRankSign,
  getCarrotHistory,
} from "@/lib/api/client";
import type {
  RankCarrotItem,
  RankUploadItem,
  RankPlayingItem,
  RankSignItem,
  CarrotHistoryItem,
} from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

type TabType = "ranks" | "carrot";
type RankTabType = "carrot" | "upload" | "playing" | "sign";

function formatSize(size: number) {
  if (size === 0) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const units = ["B", "KB", "MB", "GB", "TB"];
  return `${Math.round((size / Math.pow(1024, i)) * 100) / 100} ${units[i]}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRankIcon(index: number) {
  if (index === 1) return "🥇";
  if (index === 2) return "🥈";
  if (index === 3) return "🥉";
  return `#${index}`;
}

export default function CommunityPage() {
  const { token, user } = useUserConsole();
  const [activeTab, setActiveTab] = useState<TabType>("ranks");
  const [activeRankTab, setActiveRankTab] = useState<RankTabType>("carrot");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [carrotRank, setCarrotRank] = useState<RankCarrotItem[]>([]);
  const [uploadRank, setUploadRank] = useState<RankUploadItem[]>([]);
  const [playingRank, setPlayingRank] = useState<RankPlayingItem[]>([]);
  const [signRank, setSignRank] = useState<RankSignItem[]>([]);
  const [carrotHistory, setCarrotHistory] = useState<CarrotHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyType, setHistoryType] = useState<"earn" | "cost" | undefined>();
  const observerRef = useRef<HTMLDivElement>(null);

  const loadRankData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeRankTab === "carrot") {
        const data = await getRankCarrot(token);
        setCarrotRank(data);
      } else if (activeRankTab === "upload") {
        const data = await getRankUpload(token);
        setUploadRank(data);
      } else if (activeRankTab === "playing") {
        const data = await getRankPlaying(token);
        setPlayingRank(data);
      } else if (activeRankTab === "sign") {
        const data = await getRankSign(token);
        setSignRank(data);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [token, activeRankTab]);

  const loadCarrotHistory = useCallback(
    async (mode: "reset" | "append" = "reset", page = 1) => {
      setLoading(true);
      try {
        const params = historyType ? { type: historyType } : undefined;
        const data = await getCarrotHistory(
          { ...params, page, page_size: 20 },
          token
        );
        if (mode === "reset") {
          setCarrotHistory(data.items);
        } else {
          setCarrotHistory((prev) => {
            const existingIds = new Set(prev.map((item) => item.created_at));
            return [
              ...prev,
              ...data.items.filter((item) => !existingIds.has(item.created_at)),
            ];
          });
        }
        setHistoryTotal(data.total);
        setHistoryPage(page);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [token, historyType]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeTab === "ranks") {
        void loadRankData();
      } else if (activeTab === "carrot") {
        void loadCarrotHistory("reset", 1);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, activeRankTab, historyType, loadRankData, loadCarrotHistory]);

  const loadMoreHistory = useCallback(() => {
    if (!loading && historyTotal > carrotHistory.length) {
      void loadCarrotHistory("append", historyPage + 1);
    }
  }, [loading, historyTotal, carrotHistory.length, historyPage, loadCarrotHistory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeTab === "carrot") {
          loadMoreHistory();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreHistory, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">社区</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看排行榜与萝卜记录
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">{user.carrot}</span>
          <span className="text-xs text-muted-foreground">萝卜</span>
        </div>
      </div>

      <GlassPanel className="p-2">
        <div className="flex gap-1">
          {[
            { key: "ranks", label: "排行榜", icon: Trophy },
            { key: "carrot", label: "萝卜记录", icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabType)}
                className={
                  isActive
                    ? "flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                    : "flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {message ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      {activeTab === "ranks" ? (
        <div className="space-y-6">
          <GlassPanel className="p-2">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { key: "carrot", label: "萝卜榜", icon: Coins },
                { key: "upload", label: "上传榜", icon: ArrowUpRight },
                { key: "playing", label: "正在看", icon: Play },
                { key: "sign", label: "签到榜", icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeRankTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveRankTab(tab.key as RankTabType)}
                    className={
                      isActive
                        ? "flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shrink-0"
                        : "flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground shrink-0"
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel>
            {loading && carrotRank.length === 0 && uploadRank.length === 0 && playingRank.length === 0 && signRank.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {activeRankTab === "carrot" && carrotRank.length > 0 ? (
              <div className="space-y-2">
                {carrotRank.map((item) => (
                  <div
                    key={item.username}
                    className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-lg font-bold">
                      {getRankIcon(item.index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.username}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-amber-500">
                        {item.carrot} 萝卜
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeRankTab === "upload" && uploadRank.length > 0 ? (
              <div className="space-y-2">
                {uploadRank.map((item) => (
                  <div
                    key={item.username}
                    className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-lg font-bold">
                      {getRankIcon(item.index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.username}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-500">
                        {formatSize(item.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeRankTab === "playing" && playingRank.length > 0 ? (
              <div className="space-y-2">
                {playingRank.map((item, index) => (
                  <div
                    key={`${item.todb_id}-${item.tmdb_id}-${item.season_number}-${item.episode_number}-${index}`}
                    className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-lg font-bold">
                      <Play className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.video_title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.season_number !== null && item.episode_number !== null
                          ? `S${item.season_number}E${item.episode_number}`
                          : item.video_type === "movie" ? "电影" : item.video_type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {item.upload_pseudonym}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.play_speed / 10}x
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeRankTab === "sign" && signRank.length > 0 ? (
              <div className="space-y-2">
                {signRank.map((item) => (
                  <div
                    key={item.username}
                    className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-lg font-bold">
                      {getRankIcon(item.sign_index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.username}</div>
                      <div className="text-xs text-muted-foreground">
                        连续 {item.continuous_days} 天
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-500">
                        +{item.earn_point} 萝卜
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(item.sign_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!loading &&
              ((activeRankTab === "carrot" && carrotRank.length === 0) ||
                (activeRankTab === "upload" && uploadRank.length === 0) ||
                (activeRankTab === "playing" && playingRank.length === 0) ||
                (activeRankTab === "sign" && signRank.length === 0)) ? (
              <div className="py-12 text-center text-muted-foreground">
                暂无数据
              </div>
            ) : null}
          </GlassPanel>
        </div>
      ) : null}

      {activeTab === "carrot" ? (
        <div className="space-y-6">
          <GlassPanel className="p-2">
            <div className="flex gap-1">
              {[
                { key: undefined, label: "全部" },
                { key: "earn", label: "获得" },
                { key: "cost", label: "消费" },
              ].map((tab) => {
                const isActive = historyType === tab.key;
                return (
                  <button
                    key={tab.key || "all"}
                    type="button"
                    onClick={() => {
                      setHistoryType(tab.key as "earn" | "cost" | undefined);
                      setCarrotHistory([]);
                    }}
                    className={
                      isActive
                        ? "rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                        : "rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel>
            {carrotHistory.length > 0 ? (
              <div className="space-y-2">
                {carrotHistory.map((item, index) => (
                  <div
                    key={`${item.created_at}-${index}`}
                    className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        item.type === "earn"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      <Coins className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.trigger_type_string}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          item.type === "earn" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {item.type === "earn" ? "+" : "-"}
                        {item.point}
                      </div>
                      {item.expired_at ? (
                        <div className="text-xs text-muted-foreground">
                          过期: {formatDate(item.expired_at)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {loading && carrotHistory.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {!loading && carrotHistory.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                暂无记录
              </div>
            ) : null}

            {carrotHistory.length > 0 && carrotHistory.length < historyTotal ? (
              <div ref={observerRef} className="py-4 text-center">
                {loading ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            ) : null}
          </GlassPanel>
        </div>
      ) : null}
    </div>
  );
}
