"use client";

import { AlertTriangle, Copy, Loader2, Radio, RefreshCw, Search, Tv } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getLiveLibrary, getLiveList, getLiveMedia } from "@/lib/api/client";
import type { LiveLibrary, LiveListItem, LiveMediaItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CHANNEL_PAGE_SIZE = 36;
const MEDIA_PAGE_SIZE = 80;

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface LoadError {
  title: string;
  message: string;
  permission: boolean;
}

function createLoadError(error: unknown, fallback: string): LoadError {
  const message = error instanceof Error ? error.message : fallback;
  const permission = /401|403|权限|无权|未授权|forbidden|unauthorized/i.test(message);

  return {
    title: permission ? "权限不足或授权已失效" : fallback,
    message,
    permission,
  };
}

function formatDate(value: string | null) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusMessage({ error }: { error: LoadError }) {
  return (
    <GlassPanel className={cn("p-4 text-sm leading-6", error.permission ? "border-warning/30 bg-warning/10 text-warning" : "border-danger/25 bg-danger/10 text-danger")}>
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">{error.title}</div>
          <div className="mt-1 opacity-85">{error.message}</div>
          {error.permission ? <div className="mt-2 text-xs opacity-75">请确认当前账号具备直播访问权限，或重新登录后再试。</div> : null}
        </div>
      </div>
    </GlassPanel>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-36 items-center justify-center gap-2 rounded-3xl border border-border/50 bg-muted/15 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export default function LivePage() {
  const { token } = useUserConsole();
  const [libraries, setLibraries] = useState<LiveLibrary[]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState<number | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<LoadStatus>("loading");
  const [libraryError, setLibraryError] = useState<LoadError | null>(null);

  const [channels, setChannels] = useState<LiveListItem[]>([]);
  const [activeChannel, setActiveChannel] = useState<LiveListItem | null>(null);
  const [channelStatus, setChannelStatus] = useState<LoadStatus>("idle");
  const [channelError, setChannelError] = useState<LoadError | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [medias, setMedias] = useState<LiveMediaItem[]>([]);
  const [mediaStatus, setMediaStatus] = useState<LoadStatus>("idle");
  const [mediaError, setMediaError] = useState<LoadError | null>(null);
  const [message, setMessage] = useState("");

  const activeLibrary = useMemo(() => libraries.find((library) => library.id === activeLibraryId) ?? null, [activeLibraryId, libraries]);

  const loadLibraries = useCallback(async () => {
    setLibraryStatus("loading");
    setLibraryError(null);
    setMessage("");

    try {
      const result = await getLiveLibrary(token);
      setLibraries(result);
      setActiveLibraryId((current) => current ?? result[0]?.id ?? null);
      setLibraryStatus("ready");
    } catch (error) {
      setLibraries([]);
      setActiveLibraryId(null);
      setLibraryError(createLoadError(error, "直播库加载失败"));
      setLibraryStatus("error");
    }
  }, [token]);

  const loadChannels = useCallback(async () => {
    if (activeLibraryId === null) {
      setChannels([]);
      setActiveChannel(null);
      setChannelStatus("idle");
      return;
    }

    setChannelStatus("loading");
    setChannelError(null);
    setMessage("");

    try {
      const keyword = search.trim();
      const result = await getLiveList(
        {
          library_id: activeLibraryId,
          title: keyword || undefined,
          code: keyword || undefined,
          page: 1,
          page_size: CHANNEL_PAGE_SIZE,
        },
        token
      );
      setChannels(result.items);
      setActiveChannel((current) => result.items.find((item) => item.id === current?.id) ?? result.items[0] ?? null);
      setChannelStatus("ready");
    } catch (error) {
      setChannels([]);
      setActiveChannel(null);
      setChannelError(createLoadError(error, "直播频道加载失败"));
      setChannelStatus("error");
    }
  }, [activeLibraryId, search, token]);

  const loadMedias = useCallback(async () => {
    if (!activeChannel) {
      setMedias([]);
      setMediaStatus("idle");
      return;
    }

    setMediaStatus("loading");
    setMediaError(null);
    setMessage("");

    try {
      const result = await getLiveMedia({ live_list_id: activeChannel.id, page: 1, page_size: MEDIA_PAGE_SIZE }, token);
      setMedias(result.items);
      setMediaStatus("ready");
    } catch (error) {
      setMedias([]);
      setMediaError(createLoadError(error, "直播媒体加载失败"));
      setMediaStatus("error");
    }
  }, [activeChannel, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLibraries();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLibraries]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadChannels();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadChannels]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMedias();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMedias]);

  function selectLibrary(libraryId: number) {
    setActiveLibraryId(libraryId);
    setActiveChannel(null);
    setMedias([]);
    setMediaStatus("idle");
  }

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  async function copyMediaUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("已复制直播媒体地址");
    } catch {
      setMessage("复制失败，请手动复制地址");
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Radio className="h-3.5 w-3.5" />
              Live Management
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">直播管理</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">按直播库、频道和媒体源三层浏览直播内容。当前页面基于 EMOS 直播读取接口展示，权限不足时会直接显示接口返回信息。</p>
          </div>
          <button type="button" onClick={() => void loadLibraries()} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40">
            <RefreshCw className="h-4 w-4" />
            刷新直播库
          </button>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="px-4 py-3 text-sm text-muted-foreground">{message}</GlassPanel> : null}
      {libraryError ? <StatusMessage error={libraryError} /> : null}

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr_1.1fr]">
        <GlassPanel className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">直播库</div>
              <div className="mt-1 text-xs text-muted-foreground">选择一个直播库查看频道</div>
            </div>
            <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">{libraries.length} 个</div>
          </div>

          <div className="mt-4 space-y-2">
            {libraryStatus === "loading" ? <LoadingBlock label="正在加载直播库" /> : null}
            {libraryStatus === "ready" && libraries.length === 0 ? <EmptyState title="暂无直播库" description="当前账号没有可浏览的直播库，或直播库暂未开放。" /> : null}
            {libraryStatus === "ready" && libraries.map((library) => {
              const active = activeLibraryId === library.id;

              return (
                <button key={library.id} type="button" onClick={() => selectLibrary(library.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors", active ? "border-foreground/20 bg-foreground text-background" : "border-border/55 bg-background/35 hover:bg-muted/35")}>
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border", active ? "border-background/20 bg-background/15" : "border-border/50 bg-muted/25")}>
                    {library.image_poster_url ? <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${library.image_poster_url})` }} /> : <Tv className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{library.title}</span>
                    <span className={cn("mt-1 block font-mono text-xs", active ? "text-background/65" : "text-muted-foreground")}>#{library.id}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">直播频道</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeLibrary ? activeLibrary.title : "请先选择直播库"}</div>
            </div>
            <div className="flex gap-2 sm:w-72">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitSearch()} placeholder="标题或代码" className="h-10 w-full rounded-full border border-border/70 bg-background/50 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              </label>
              <button type="button" onClick={submitSearch} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90">搜索</button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {channelError ? <StatusMessage error={channelError} /> : null}
            {channelStatus === "idle" ? <EmptyState title="未选择直播库" description="从左侧选择直播库后，这里会加载对应的直播频道。" /> : null}
            {channelStatus === "loading" ? <LoadingBlock label="正在加载直播频道" /> : null}
            {channelStatus === "ready" && channels.length === 0 ? <EmptyState title="暂无直播频道" description="当前直播库没有频道，或搜索条件没有匹配结果。" /> : null}
            {channelStatus === "ready" && channels.map((channel) => {
              const active = activeChannel?.id === channel.id;

              return (
                <button key={channel.id} type="button" onClick={() => setActiveChannel(channel)} className={cn("flex w-full gap-3 rounded-2xl border p-3 text-left transition-colors", active ? "border-primary/30 bg-primary/10" : "border-border/55 bg-background/35 hover:bg-muted/35")}>
                  <span className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-muted/20">
                    {channel.image_poster_url ? <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${channel.image_poster_url})` }} /> : <Tv className="h-5 w-5 text-muted-foreground" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{channel.title}</span>
                      <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{channel.media_count} 源</span>
                    </span>
                    {channel.tagline ? <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">{channel.tagline}</span> : null}
                    {channel.description ? <span className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{channel.description}</span> : null}
                    <span className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      {channel.code ? <span className="rounded-full border border-border/50 px-2 py-0.5 font-mono">{channel.code}</span> : null}
                      <span className="rounded-full border border-border/50 px-2 py-0.5">排序 {channel.sort}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">直播媒体</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeChannel ? activeChannel.title : "请先选择频道"}</div>
            </div>
            {activeChannel ? <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">{medias.length} 条</div> : null}
          </div>

          <div className="mt-4 space-y-3">
            {mediaError ? <StatusMessage error={mediaError} /> : null}
            {mediaStatus === "idle" ? <EmptyState title="未选择频道" description="从中间选择一个频道后，这里会显示该频道下的直播媒体源。" /> : null}
            {mediaStatus === "loading" ? <LoadingBlock label="正在加载直播媒体" /> : null}
            {mediaStatus === "ready" && medias.length === 0 ? <EmptyState title="暂无直播媒体" description="该频道暂时没有可用媒体源。" /> : null}
            {mediaStatus === "ready" && medias.map((media) => (
              <div key={media.media_id} className="rounded-2xl border border-border/55 bg-background/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{media.name}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{media.pseudonym || media.media_id}</div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px]", media.status === "normal" ? "border border-border/60 text-muted-foreground" : "bg-danger/10 text-danger")}>{media.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <div className="truncate">类型：{media.path_type}</div>
                  <div className="truncate">创建：{formatDate(media.created_at)}</div>
                  <div className="truncate font-mono">{media.path_url}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={media.path_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90">打开</a>
                  <button type="button" onClick={() => void copyMediaUrl(media.path_url)} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40">
                    <Copy className="h-3.5 w-3.5" />
                    复制
                  </button>
                  {media.is_can_edit ? <span className="inline-flex h-9 items-center rounded-full border border-border/60 px-3 text-xs text-muted-foreground">可编辑</span> : null}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
