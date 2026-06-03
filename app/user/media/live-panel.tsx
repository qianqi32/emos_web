"use client";

import { AlertTriangle, Copy, Loader2, Pencil, Plus, Radio, RefreshCw, Save, Search, Trash2, Tv, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { addLiveMedia, deleteLiveList, deleteLiveMedia, getLiveLibrary, getLiveList, getLiveMedia, saveLiveList, updateLiveMedia } from "@/lib/api/client";
import type { LiveLibrary, LiveListItem, LiveListSavePayload, LiveMediaItem, LiveMediaPayload } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const CHANNEL_PAGE_SIZE = 36;
const MEDIA_PAGE_SIZE = 80;

type LoadStatus = "idle" | "loading" | "ready" | "error";
type PendingAction = { type: "delete-channel"; channel: LiveListItem } | { type: "delete-media"; media: LiveMediaItem } | { type: "replace-medias" } | null;

interface LoadError {
  title: string;
  message: string;
  permission: boolean;
}

interface ChannelFormState {
  id: number | null;
  title: string;
  description: string;
  tagline: string;
  imagePoster: string;
}

interface MediaFormState {
  name: string;
  pathUrl: string;
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

function emptyChannelForm(): ChannelFormState {
  return {
    id: null,
    title: "",
    description: "",
    tagline: "",
    imagePoster: "",
  };
}

function isUrlLike(value: string) {
  return /^https?:\/\//i.test(value.trim());
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

export function LivePanel() {
  const { token } = useUserConsole();
  const [libraries, setLibraries] = useState<LiveLibrary[]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState<number | "all">("all");
  const [libraryStatus, setLibraryStatus] = useState<LoadStatus>("loading");
  const [libraryError, setLibraryError] = useState<LoadError | null>(null);

  const [channels, setChannels] = useState<LiveListItem[]>([]);
  const [activeChannel, setActiveChannel] = useState<LiveListItem | null>(null);
  const [channelStatus, setChannelStatus] = useState<LoadStatus>("idle");
  const [channelError, setChannelError] = useState<LoadError | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [channelForm, setChannelForm] = useState<ChannelFormState>(emptyChannelForm);
  const [channelLibraryId, setChannelLibraryId] = useState<number | null>(null);
  const [channelModalOpen, setChannelModalOpen] = useState(false);

  const [medias, setMedias] = useState<LiveMediaItem[]>([]);
  const [mediaStatus, setMediaStatus] = useState<LoadStatus>("idle");
  const [mediaError, setMediaError] = useState<LoadError | null>(null);
  const [mediaForm, setMediaForm] = useState<MediaFormState>({ name: "", pathUrl: "" });
  const [mediaSearch, setMediaSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [mutating, setMutating] = useState(false);

  const activeLibrary = useMemo(() => libraries.find((library) => library.id === activeLibraryId) ?? null, [activeLibraryId, libraries]);
  const filteredMedias = useMemo(() => {
    const keyword = mediaSearch.trim().toLowerCase();

    if (!keyword) return medias;

    return medias.filter((media) => [media.name, media.path_type, media.path_url, media.pseudonym, media.status].some((value) => value?.toLowerCase().includes(keyword)));
  }, [mediaSearch, medias]);

  const loadLibraries = useCallback(async () => {
    setLibraryStatus("loading");
    setLibraryError(null);
    setMessage("");

    try {
      const result = await getLiveLibrary(token);
      setLibraries(result);
      setLibraryStatus("ready");
    } catch (error) {
      setLibraries([]);
      setLibraryError(createLoadError(error, "直播库加载失败"));
      setLibraryStatus("error");
    }
  }, [token]);

  const loadChannels = useCallback(async () => {
    setChannelStatus("loading");
    setChannelError(null);
    setMessage("");

    try {
      const keyword = search.trim();
      const result = await getLiveList(
        {
          library_id: activeLibraryId === "all" ? undefined : activeLibraryId,
          title: keyword || undefined,
          code: keyword || undefined,
          page: 1,
          page_size: CHANNEL_PAGE_SIZE,
        },
        token
      );
      setChannels(result.items);
      setActiveChannel((current) => result.items.find((item) => item.id === current?.id) ?? current);
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
    if (!sourceModalOpen) return;

    const timer = window.setTimeout(() => {
      void loadMedias();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMedias, sourceModalOpen]);

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  function openCreateChannel() {
    setChannelForm(emptyChannelForm());
    setChannelLibraryId(activeLibraryId === "all" ? libraries[0]?.id ?? null : activeLibraryId);
    setFormError("");
    setChannelModalOpen(true);
  }

  function openEditChannel(channel: LiveListItem) {
    setActiveChannel(channel);
    setChannelForm({
      id: channel.id,
      title: channel.title,
      description: channel.description ?? "",
      tagline: channel.tagline ?? "",
      imagePoster: "",
    });
    setFormError("");
    setChannelModalOpen(true);
  }

  function openSources(channel: LiveListItem) {
    setActiveChannel(channel);
    setMediaForm({ name: "", pathUrl: "" });
    setBulkText("");
    setFormError("");
    setSourceModalOpen(true);
  }

  async function submitChannel() {
    if (!channelLibraryId) {
      setFormError("请先选择直播库");
      return;
    }

    const title = channelForm.title.trim();
    const imagePoster = channelForm.imagePoster.trim();
    if (!title) {
      setFormError("请输入频道标题");
      return;
    }

    if (imagePoster && isUrlLike(imagePoster)) {
      setFormError("直播接口需要 image_poster 文件 ID，不能填写图片 URL。请留空或填写已有图片文件 ID。");
      return;
    }

    const payload: LiveListSavePayload = {
      id: channelForm.id,
      live_library_id: channelLibraryId,
      title,
      description: channelForm.description.trim() || null,
      tagline: channelForm.tagline.trim() || null,
      image_poster: imagePoster || null,
    };

    setMutating(true);
    setFormError("");

    try {
      const result = await saveLiveList(payload, token);
      setMessage(`频道已保存${typeof result.count === "number" ? `，当前计数 ${result.count}` : ""}`);
      setChannelModalOpen(false);
      setChannelForm(emptyChannelForm());
      await loadChannels();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "频道保存失败");
    } finally {
      setMutating(false);
    }
  }

  async function submitMedia() {
    if (!activeChannel) {
      setFormError("请先选择频道");
      return;
    }

    const name = mediaForm.name.trim();
    const pathUrl = mediaForm.pathUrl.trim();
    if (!name || !pathUrl) {
      setFormError("请输入源名称和 m3u8 地址");
      return;
    }

    const payload: LiveMediaPayload = {
      live_list_id: activeChannel.id,
      name,
      path_type: "m3u8",
      path_url: pathUrl,
    };

    setMutating(true);
    setFormError("");

    try {
      const result = await addLiveMedia(payload, token);
      setMessage(`直播源已添加，消耗后剩余萝卜 ${result.carrot}`);
      setMediaForm({ name: "", pathUrl: "" });
      await loadMedias();
      await loadChannels();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "直播源添加失败");
    } finally {
      setMutating(false);
    }
  }

  function parseBulkMedias() {
    return bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, pathUrl] = line.split("|").map((item) => item.trim());
        return name && pathUrl ? { name, path_type: "m3u8" as const, path_url: pathUrl } : null;
      })
      .filter((item): item is { name: string; path_type: "m3u8"; path_url: string } => item !== null);
  }

  async function confirmPending() {
    if (!pending) return;

    setMutating(true);
    setFormError("");

    try {
      if (pending.type === "delete-channel") {
        await deleteLiveList(pending.channel.id, token);
        setMessage("直播频道已删除");
        setPending(null);
        setChannelModalOpen(false);
        setSourceModalOpen(false);
        setActiveChannel(null);
        await loadChannels();
      }

      if (pending.type === "delete-media") {
        const result = await deleteLiveMedia(pending.media.media_id, token);
        setMessage(`直播源已删除，剩余萝卜 ${result.carrot}`);
        setPending(null);
        await loadMedias();
        await loadChannels();
      }

      if (pending.type === "replace-medias") {
        if (!activeChannel) {
          throw new Error("请先选择频道");
        }

        const mediasPayload = parseBulkMedias();
        const result = await updateLiveMedia({ live_list_id: activeChannel.id, medias: mediasPayload }, token);
        setMessage(`直播源已批量更新，删除 ${result.delete_count} 条旧源`);
        setBulkText("");
        setPending(null);
        await loadMedias();
        await loadChannels();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "操作失败");
    } finally {
      setMutating(false);
    }
  }

  async function copyMediaUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("已复制直播媒体地址");
    } catch {
      setMessage("复制失败，请手动复制地址");
    }
  }

  const pendingDescription = pending?.type === "delete-channel" ? `确认删除直播频道「${pending.channel.title}」？官方直播不可删除，接口会返回实际权限结果。` : pending?.type === "delete-media" ? `确认删除直播源「${pending.media.name}」？` : "确认按文本框内容批量替换自己添加的直播源？留空会删除自己添加的所有源。";

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={message} onClose={() => setMessage("")} />
      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative sm:w-44">
              <select value={activeLibraryId} onChange={(event) => setActiveLibraryId(event.target.value === "all" ? "all" : Number(event.target.value))} className="h-11 w-full appearance-none rounded-2xl border border-border/70 bg-background/70 px-4 pr-9 text-sm font-semibold outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="all">全部库</option>
                {libraries.map((library) => (
                  <option key={library.id} value={library.id}>{library.title}</option>
                ))}
              </select>
            </label>
            <label className="relative sm:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitSearch()} placeholder="搜索名称/代码..." className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <button type="button" onClick={submitSearch} className="inline-flex h-11 items-center justify-center rounded-2xl border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40">搜索</button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadChannels()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40">
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
            <button type="button" onClick={openCreateChannel} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" />
              创建直播
            </button>
          </div>
        </div>
      </GlassPanel>

      {libraryError ? <StatusMessage error={libraryError} /> : null}
      {channelError ? <StatusMessage error={channelError} /> : null}

      {libraryStatus === "loading" || channelStatus === "loading" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-3xl border border-border/50 bg-muted/20" />)}
        </div>
      ) : null}

      {channelStatus === "ready" && channels.length === 0 ? <GlassPanel className="p-10"><EmptyState title="暂无直播频道" description="当前筛选条件下没有频道，选择具体直播库后可以创建新的直播频道。" /></GlassPanel> : null}

      {channelStatus === "ready" && channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <GlassPanel key={channel.id} className="group overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1">
              <button type="button" onClick={() => openSources(channel)} className="block w-full text-left">
                <div className="relative aspect-[16/9] overflow-hidden bg-muted/25">
                  {channel.image_poster_url ? (
                    <div role="img" aria-label={channel.title} className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${channel.image_poster_url})` }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--muted))_0,hsl(var(--background))_58%,hsl(var(--muted))_100%)]">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur">
                        <Tv className="h-7 w-7 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-4 text-white">
                    <div className="line-clamp-1 text-base font-semibold drop-shadow-sm">{channel.title}</div>
                    <div className="mt-1 line-clamp-1 text-xs text-white/80">{channel.tagline || channel.code || "直播频道"}</div>
                  </div>
                </div>
              </button>
              <div className="space-y-3 border-t border-border/45 bg-background/80 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{channel.media_count} 个源</span>
                  <span className="truncate text-xs text-muted-foreground">{activeLibrary?.title ?? channel.code ?? `#${channel.id}`}</span>
                </div>
                <div className={channel.is_can_edit ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
                  {channel.is_can_edit ? (
                    <button type="button" onClick={() => openEditChannel(channel)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/70 text-xs font-semibold transition-colors hover:bg-muted/40">
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </button>
                  ) : null}
                  <button type="button" onClick={() => openSources(channel)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/70 text-xs font-semibold transition-colors hover:bg-muted/40">
                    <Radio className="h-3.5 w-3.5" />
                    源
                  </button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : null}

      {channelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-t-3xl border border-border/60 bg-background shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div>
                <div className="text-base font-semibold">{channelForm.id ? "编辑直播频道" : "创建直播频道"}</div>
                <div className="mt-1 text-xs text-muted-foreground">选择直播库后保存频道</div>
              </div>
              <button type="button" onClick={() => setChannelModalOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 hover:bg-muted/40"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              {formError ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</div> : null}
              <select value={channelLibraryId ?? ""} onChange={(event) => setChannelLibraryId(event.target.value ? Number(event.target.value) : null)} className="h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="">选择直播库</option>
                {libraries.map((library) => (
                  <option key={library.id} value={library.id}>{library.title}</option>
                ))}
              </select>
              <input value={channelForm.title} onChange={(event) => setChannelForm((current) => ({ ...current, title: event.target.value }))} placeholder="频道标题" className="h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <input value={channelForm.tagline} onChange={(event) => setChannelForm((current) => ({ ...current, tagline: event.target.value }))} placeholder="宣传词，可空" className="h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <input value={channelForm.imagePoster} onChange={(event) => setChannelForm((current) => ({ ...current, imagePoster: event.target.value }))} placeholder="图片文件 ID，可空，不是图片 URL" className="h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <div className="text-xs leading-5 text-muted-foreground">接口要求传图片文件 ID；当前项目没有可复用的文件 ID 上传入口，所以这里不会接收临时图片 URL。</div>
              <textarea value={channelForm.description} onChange={(event) => setChannelForm((current) => ({ ...current, description: event.target.value }))} placeholder="简介，可空" rows={4} className="w-full resize-none rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <div className="flex gap-2 pt-2">
                {activeChannel?.is_can_edit && channelForm.id ? (
                  <button type="button" onClick={() => setPending({ type: "delete-channel", channel: activeChannel })} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-danger/30 px-4 text-sm font-semibold text-danger hover:bg-danger/10">
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                ) : null}
                <button type="button" onClick={() => void submitChannel()} disabled={mutating || !channelLibraryId} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">
                  <Save className="h-4 w-4" />
                  保存频道
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {sourceModalOpen && activeChannel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-background shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="min-w-0">
                <div className="line-clamp-1 text-base font-semibold">媒体源 · {activeChannel.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">管理播放源 · {filteredMedias.length}/{medias.length} 条</div>
              </div>
              <button type="button" onClick={() => setSourceModalOpen(false)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 hover:bg-muted/40"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {formError ? <div className="mb-4 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</div> : null}
              <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-border/60 bg-muted/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">新增直播源</div>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">m3u8</span>
                    </div>
                    <div className="grid gap-2">
                      <input value={mediaForm.name} onChange={(event) => setMediaForm((current) => ({ ...current, name: event.target.value }))} placeholder="源名称，例如 1080p" className="h-11 rounded-2xl border border-border/70 bg-background/60 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                      <input value={mediaForm.pathUrl} onChange={(event) => setMediaForm((current) => ({ ...current, pathUrl: event.target.value }))} placeholder="m3u8 地址" className="h-11 rounded-2xl border border-border/70 bg-background/60 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                      <button type="button" onClick={() => void submitMedia()} disabled={mutating} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">
                        <Plus className="h-4 w-4" />
                        添加直播源
                      </button>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-muted/10 p-4">
                    <div className="mb-3 text-sm font-semibold">批量更新</div>
                    <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} rows={5} placeholder={"每行一个：名称 | m3u8地址\n留空确认则删除自己添加的所有源"} className="w-full resize-none rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                    <button type="button" onClick={() => setPending({ type: "replace-medias" })} disabled={mutating} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-warning/40 px-4 text-sm font-semibold text-warning hover:bg-warning/10 disabled:opacity-50">
                      <Save className="h-4 w-4" />
                      批量更新
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold">播放源列表</div>
                    <label className="relative sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="搜索源名称/类型/地址" className="h-10 w-full rounded-2xl border border-border/70 bg-background/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                    </label>
                  </div>
                  {mediaError ? <StatusMessage error={mediaError} /> : null}
                  {mediaStatus === "loading" ? <LoadingBlock label="正在加载直播媒体" /> : null}
                  {mediaStatus === "ready" && medias.length === 0 ? <EmptyState title="暂无直播媒体" description="该频道暂时没有可用媒体源。" /> : null}
                  {mediaStatus === "ready" && medias.length > 0 && filteredMedias.length === 0 ? <EmptyState title="没有匹配的播放源" description="换个名称、类型或地址关键词试试。" /> : null}
                  {mediaStatus === "ready" && filteredMedias.length > 0 ? (
                    <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/45">
                      <div className="hidden grid-cols-[minmax(0,1.35fr)_0.5fr_0.75fr_0.55fr] gap-4 border-b border-border/60 bg-muted/20 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid">
                        <div>名称 / 地址</div>
                        <div>类型</div>
                        <div>上传者</div>
                        <div className="text-right">操作</div>
                      </div>
                      <div className="divide-y divide-border/55">
                        {filteredMedias.map((media) => (
                          <div key={media.media_id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.35fr)_0.5fr_0.75fr_0.55fr] md:items-center md:gap-4">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{media.name}</div>
                              <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{media.path_url}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full border border-border/60 px-2.5 py-1 font-semibold text-foreground">{media.path_type}</span>
                            </div>
                            <div className="min-w-0 text-xs text-muted-foreground">
                              <div className="truncate">{media.pseudonym || media.media_id}</div>
                              <div className="mt-1 truncate text-[11px]">{formatDate(media.created_at)}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <button type="button" onClick={() => void copyMediaUrl(media.path_url)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40">
                                <Copy className="h-3.5 w-3.5" />
                                复制
                              </button>
                              {media.is_can_edit ? (
                                <button type="button" onClick={() => setPending({ type: "delete-media", media })} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-danger/30 px-3 text-xs font-semibold text-danger hover:bg-danger/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  删除
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog open={pending !== null} title="确认直播管理操作" description={pendingDescription} confirmLabel="确认执行" tone={pending?.type === "replace-medias" ? "default" : "danger"} loading={mutating} error={formError} onConfirm={() => void confirmPending()} onCancel={() => setPending(null)} />
    </div>
  );
}
