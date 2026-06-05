"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Loader2, Trophy, Play, Coins, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  getRankCarrot,
  getRankUpload,
  getRankPlaying,
  getRankPlayingLive,
  getCarrotHistory,
} from "@/lib/api/client";
import type {
  RankCarrotItem,
  RankUploadItem,
  RankPlayingItem,
  RankPlayingLiveItem,
  CarrotHistoryItem,
} from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { BanPanel } from "@/components/dashboard/ban-panel";

type TabType = "rank" | "carrot" | "ban";
type RankTabType = "carrot" | "upload" | "playing" | "playing-live";

function formatSize(size: number) {
  if (size === 0) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const units = ["B", "KB", "MB", "GB", "TB"];
  return `${Math.round((size / Math.pow(1024, i)) * 100) / 100} ${units[i]}`;
}

function formatDate(dateString: string) {
  // API 返回 UTC 时间，需转为北京时间（+8h）
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").slice(0, 16);
  }
  const bj = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = bj.getUTCFullYear();
  const m = String(bj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bj.getUTCDate()).padStart(2, "0");
  const h = String(bj.getUTCHours()).padStart(2, "0");
  const min = String(bj.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${restSeconds} 秒`;
  }

  return `${minutes} 分 ${restSeconds.toString().padStart(2, "0")} 秒`;
}

function getRankIcon(index: number) {
  if (index === 1) return "🥇";
  if (index === 2) return "🥈";
  if (index === 3) return "🥉";
  return `#${index}`;
}

function readTab(value: string | null): TabType {
  return value === "carrot" || value === "ban" ? value : "rank";
}

export default function CommunityPage() {
  const { token, user } = useUserConsole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = readTab(searchParams.get("tab"));
  const [activeRankTab, setActiveRankTab] = useState<RankTabType>("carrot");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [carrotRank, setCarrotRank] = useState<RankCarrotItem[]>([]);
  const [uploadRank, setUploadRank] = useState<RankUploadItem[]>([]);
  const [playingRank, setPlayingRank] = useState<RankPlayingItem[]>([]);
  const [playingLiveRank, setPlayingLiveRank] = useState<RankPlayingLiveItem[]>([]);
  const [carrotHistory, setCarrotHistory] = useState<CarrotHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTypeInput, setHistoryTypeInput] = useState<"" | "earn" | "cost">("");
  const [historyType, setHistoryType] = useState<"earn" | "cost" | undefined>();
  const [historyUserInput, setHistoryUserInput] = useState("");
  const [historyUserId, setHistoryUserId] = useState("");
  const [historyQueryKey, setHistoryQueryKey] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const initialScrollYRef = useRef(0);
  const [canAutoLoadMore, setCanAutoLoadMore] = useState(false);

  function setCommunityTab(tab: TabType) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "rank") {
      params.set("tab", "rank");
    } else {
      params.set("tab", tab);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const loadRankData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
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
      } else if (activeRankTab === "playing-live") {
        const data = await getRankPlayingLive(token);
        setPlayingLiveRank(data);
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
      setMessage(null);
      try {
        const params = {
          type: historyType,
          user_id: historyUserId.trim() || undefined,
        };
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
    [token, historyType, historyUserId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeTab === "rank") {
        void loadRankData();
      } else if (activeTab === "carrot") {
        setCanAutoLoadMore(false);
        initialScrollYRef.current = window.scrollY;
        void loadCarrotHistory("reset", 1);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, activeRankTab, historyType, historyQueryKey, loadRankData, loadCarrotHistory]);

  const loadMoreHistory = useCallback(() => {
    if (!loading && historyTotal > carrotHistory.length) {
      setCanAutoLoadMore(false);
      void loadCarrotHistory("append", historyPage + 1);
    }
  }, [loading, historyTotal, carrotHistory.length, historyPage, loadCarrotHistory]);

  useEffect(() => {
    initialScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY - initialScrollYRef.current > 160) {
        setCanAutoLoadMore(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!canAutoLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeTab === "carrot") {
          loadMoreHistory();
        }
      },
      { threshold: 0.1, rootMargin: "120px" }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [canAutoLoadMore, loadMoreHistory, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">社区</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看排行榜、萝卜记录与封禁管理
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
              { key: "rank", label: "排行榜", icon: Trophy },
              { key: "carrot", label: "萝卜记录", icon: Coins },
              { key: "ban", label: "封禁管理", icon: ShieldAlert },
            ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCommunityTab(tab.key as TabType)}
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

      {activeTab === "rank" ? (
        <div className="space-y-6">
          <GlassPanel className="p-2">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { key: "carrot", label: "萝卜榜", icon: Coins },
                { key: "upload", label: "上传榜", icon: ArrowUpRight },
                { key: "playing", label: "正在看", icon: Play },
                { key: "playing-live", label: "直播榜", icon: Play },
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
            {loading && carrotRank.length === 0 && uploadRank.length === 0 && playingRank.length === 0 && playingLiveRank.length === 0 ? (
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
                    key={`${item.username}-${item.todb_id}-${item.tmdb_id}-${item.season_number}-${item.episode_number}-${index}`}
                    className="grid gap-3 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {item.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 sm:hidden">
                        <div className="truncate font-semibold">{item.username}</div>
                        <div className="text-xs text-muted-foreground">{item.ua}</div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="hidden truncate font-semibold sm:block">{item.username}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:mt-1.5">
                        <span className="rounded-full bg-background/60 px-2 py-0.5 text-foreground">{item.video_title}</span>
                        <span>
                          {item.season_number !== null && item.episode_number !== null
                            ? `S${item.season_number}E${item.episode_number}`
                            : item.video_type === "movie" ? "电影" : item.video_type}
                        </span>
                        <span>{item.play_speed / 10}x</span>
                        <span>{formatDuration(item.play_seconds)}</span>
                      </div>
                    </div>
                    <div className="text-left text-xs text-muted-foreground sm:text-right">
                      <div>上传者：{item.upload_pseudonym || "未知"}</div>
                      <div className="mt-1 hidden sm:block">{item.ua}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeRankTab === "playing-live" && playingLiveRank.length > 0 ? (
              <div className="space-y-2">
                {playingLiveRank.map((item, index) => (
                  <div
                    key={`${item.live_title}-${item.username}-${index}`}
                    className="flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-lg font-bold">
                      <Play className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.live_title}</div>
                      <div className="text-xs text-muted-foreground">直播</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {item.username || "未知用户"}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!loading &&
              ((activeRankTab === "carrot" && carrotRank.length === 0) ||
                (activeRankTab === "upload" && uploadRank.length === 0) ||
                (activeRankTab === "playing" && playingRank.length === 0) ||
                (activeRankTab === "playing-live" && playingLiveRank.length === 0)) ? (
              <div className="py-12 text-center text-muted-foreground">
                暂无数据
              </div>
            ) : null}
          </GlassPanel>
        </div>
      ) : null}

      {activeTab === "ban" ? (
        <BanPanel />
      ) : null}

      {activeTab === "carrot" ? (
        <div className="space-y-6">
          <GlassPanel className="p-2">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={historyUserInput}
                  onChange={(event) => setHistoryUserInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setCarrotHistory([]);
                      setHistoryUserId(historyUserInput.trim());
                      setHistoryType(historyTypeInput || undefined);
                      setHistoryQueryKey((current) => current + 1);
                    }
                  }}
                  placeholder="输入 user_id 查询其他用户萝卜记录，留空查询当前账号"
                  className="h-11 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <select value={historyTypeInput} onChange={(event) => setHistoryTypeInput(event.target.value as "" | "earn" | "cost")} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="">全部类型</option>
                <option value="earn">收入</option>
                <option value="cost">支出</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setCarrotHistory([]);
                  setHistoryUserId(historyUserInput.trim());
                  setHistoryType(historyTypeInput || undefined);
                  setHistoryQueryKey((current) => current + 1);
                }}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                查询
              </button>
              <button
                type="button"
                onClick={() => {
                  setCarrotHistory([]);
                  void loadCarrotHistory("reset", 1);
                }}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
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
