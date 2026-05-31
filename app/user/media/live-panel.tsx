"use client";

import { Copy, Loader2, Radio, RefreshCw, Tv, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getLiveLibrary, getLiveList, getLiveMedia } from "@/lib/api/client";
import type { LiveLibrary, LiveListItem, LiveMediaItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const LIST_PAGE_SIZE = 24;

export function LivePanel() {
  const { token } = useUserConsole();
  const [libraries, setLibraries] = useState<LiveLibrary[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<number | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [channels, setChannels] = useState<LiveListItem[]>([]);
  const [channelStatus, setChannelStatus] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeChannel, setActiveChannel] = useState<LiveListItem | null>(null);
  const [medias, setMedias] = useState<LiveMediaItem[]>([]);
  const [mediaStatus, setMediaStatus] = useState<"loading" | "ready" | "error">("loading");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadLibraries = useCallback(async () => {
    setLibraryStatus("loading");
    setMessage("");

    try {
      const result = await getLiveLibrary(token);
      setLibraries(result);
      setActiveLibrary((current) => current ?? result[0]?.id ?? null);
      setLibraryStatus("ready");
    } catch (error) {
      setLibraryStatus("error");
      setMessage(error instanceof Error ? error.message : "直播媒体库加载失败");
    }
  }, [token]);

  const loadChannels = useCallback(async () => {
    if (activeLibrary === null) {
      return;
    }

    setChannelStatus("loading");
    setMessage("");

    try {
      const result = await getLiveList(
        {
          library_id: activeLibrary,
          title: search.trim() || undefined,
          page: 1,
          page_size: LIST_PAGE_SIZE,
        },
        token
      );
      setChannels(result.items);
      setChannelStatus("ready");
    } catch (error) {
      setChannels([]);
      setChannelStatus("error");
      setMessage(error instanceof Error ? error.message : "直播频道加载失败");
    }
  }, [activeLibrary, search, token]);

  const loadMedias = useCallback(
    async (channel: LiveListItem) => {
      setMediaStatus("loading");
      setMedias([]);
      setPlayingUrl(null);

      try {
        const result = await getLiveMedia({ live_list_id: channel.id, page: 1, page_size: 50 }, token);
        setMedias(result.items);
        setMediaStatus("ready");
      } catch (error) {
        setMediaStatus("error");
        setMessage(error instanceof Error ? error.message : "直播源加载失败");
      }
    },
    [token]
  );

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

  function handleOpenChannel(channel: LiveListItem) {
    setActiveChannel(channel);
    void loadMedias(channel);
  }

  function handleCloseChannel() {
    setActiveChannel(null);
    setMedias([]);
    setPlayingUrl(null);
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("已复制直播源地址");
    } catch {
      setMessage("复制失败，请手动选择地址");
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radio className="h-4 w-4 text-muted-foreground" />
              直播频道
            </div>
            <p className="mt-1 text-sm text-muted-foreground">播放源为 m3u8，可直接播放或复制到外部播放器。</p>
          </div>
          <button
            type="button"
            onClick={() => void loadChannels()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="px-4 py-3 text-sm text-muted-foreground">{message}</GlassPanel> : null}

      <GlassPanel className="p-4 sm:p-5">
        {libraryStatus === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载媒体库
          </div>
        ) : null}
        {libraryStatus === "error" ? <div className="text-sm text-danger">{message}</div> : null}
        {libraryStatus === "ready" ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {libraries.map((library) => {
                const isActive = activeLibrary === library.id;
                return (
                  <button
                    key={library.id}
                    type="button"
                    onClick={() => setActiveLibrary(library.id)}
                    className={
                      isActive
                        ? "shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                        : "shrink-0 rounded-full border border-border/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    }
                  >
                    {library.title}
                  </button>
                );
              })}
            </div>
            <label className="relative block lg:w-72">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setSearch(searchInput)}
                placeholder="搜索频道标题"
                className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
        ) : null}
      </GlassPanel>

      {channelStatus === "loading" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl border border-border/50 bg-muted/25" />
          ))}
        </div>
      ) : null}
      {channelStatus === "error" ? <GlassPanel className="p-6 text-sm text-danger">{message}</GlassPanel> : null}
      {channelStatus === "ready" && channels.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无直播频道</GlassPanel> : null}
      {channelStatus === "ready" && channels.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => handleOpenChannel(channel)}
                className="group block overflow-hidden rounded-3xl border border-border/55 bg-background/45 text-left shadow-glass transition-transform duration-200 hover:-translate-y-1 hover:bg-background/60"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                  {channel.image_poster_url ? (
                    <div role="img" aria-label={channel.title} className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${channel.image_poster_url})` }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Tv className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                    {channel.media_count} 源
                  </div>
                </div>
                <div className="border-t border-border/45 bg-background/70 p-3 backdrop-blur-md">
                  <div className="line-clamp-1 text-sm font-semibold">{channel.title}</div>
                  {channel.tagline ? <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{channel.tagline}</div> : null}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {activeChannel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-background sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="min-w-0">
                <div className="text-base font-semibold">{activeChannel.title}</div>
                {activeChannel.description ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{activeChannel.description}</div> : null}
              </div>
              <button type="button" onClick={handleCloseChannel} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {playingUrl ? (
                <div className="mb-4 overflow-hidden rounded-2xl border border-border/60 bg-black">
                  <video key={playingUrl} src={playingUrl} controls autoPlay playsInline className="aspect-video w-full">
                    您的浏览器不支持直接播放此直播源。
                  </video>
                </div>
              ) : null}
              {mediaStatus === "loading" ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载直播源
                </div>
              ) : null}
              {mediaStatus === "error" ? <div className="py-8 text-sm text-danger">{message}</div> : null}
              {mediaStatus === "ready" && medias.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">该频道暂无直播源</div> : null}
              {mediaStatus === "ready" && medias.length > 0 ? (
                <div className="space-y-2">
                  {medias.map((media) => (
                    <div key={media.media_id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{media.name}</span>
                          <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{media.path_type}</span>
                          {media.status !== "normal" ? <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger">{media.status}</span> : null}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{media.pseudonym}</div>
                      </div>
                      <button type="button" onClick={() => setPlayingUrl(media.path_url)} className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90">播放</button>
                      <button type="button" onClick={() => void handleCopy(media.path_url)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40" aria-label="复制地址">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
