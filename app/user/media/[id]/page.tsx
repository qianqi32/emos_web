"use client";

import { ArrowLeft, Copy, Film, ListTree, RefreshCw, Subtitles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { deleteMedia, deleteSubtitle, getMediaList, getMediaPlayUrl, getSubtitleList, getVideoEpisodes, getVideoList, getVideoSeasons, moveMedia, renameMedia, renameSubtitle } from "@/lib/api/client";
import type { VideoEpisodeItem, VideoListItem, VideoMediaItem, VideoSeasonItem, VideoSubtitleItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatFileSize(value?: number | null) {
  if (!value) {
    return "未知大小";
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function itemTypeFromId(itemId: string) {
  if (itemId.startsWith("vl-")) {
    return "vl";
  }

  if (itemId.startsWith("vs-")) {
    return "vs";
  }

  if (itemId.startsWith("ve-")) {
    return "ve";
  }

  return "";
}

function mediaTitle(media: VideoMediaItem) {
  return media.media_name?.trim() || media.media_id;
}

function subtitleTitle(subtitle: VideoSubtitleItem) {
  return subtitle.subtitle_title?.trim() || subtitle.subtitle_id;
}

function videoTitle(video: VideoListItem | null, videoId: string) {
  return video?.video_title || video?.video_origin_title || `媒体 #${videoId}`;
}

function findMediaEpisode(media: VideoMediaItem, episodes: VideoEpisodeItem[]) {
  const itemId = textValue(media.item_id, "") || textValue(media.video_episode_id, "");
  return episodes.find((item) => item.item_id === itemId || String(item.episode_id) === itemId || `ve-${item.episode_id}` === itemId) || null;
}

function mediaEpisodeLabel(media: VideoMediaItem, episodes: VideoEpisodeItem[]) {
  const episode = findMediaEpisode(media, episodes);

  if (episode) {
    const episodePrefix = `第 ${episode.episode_number} 集`;
    return episode.episode_title ? `${episodePrefix} · ${episode.episode_title}` : episodePrefix;
  }

  const itemId = textValue(media.item_id, "") || textValue(media.video_episode_id, "");

  if (itemId.startsWith("vl-")) {
    return "电影资源";
  }

  if (itemId.startsWith("vs-")) {
    return "季资源";
  }

  return "未匹配集数";
}

function mediaSpecTitle(media: VideoMediaItem) {
  const title = mediaTitle(media);
  const uploader = textValue(media.user_pseudonym, "");

  if (!uploader) {
    return title;
  }

  const suffixes = [` - ${uploader} 上传`, `-${uploader}上传`, ` ${uploader} 上传`];
  const matchedSuffix = suffixes.find((suffix) => title.endsWith(suffix));

  if (!matchedSuffix) {
    return title;
  }

  return title.slice(0, -matchedSuffix.length).trim() || title;
}

function mediaTechnicalLine(media: VideoMediaItem) {
  return `${mediaSpecTitle(media)} · ${media.media_status || "unknown"} · ${formatFileSize(media.media_file_size)} · 上传者 ${textValue(media.user_pseudonym)} · 字幕 ${media.subtitle_count || 0}`;
}

function tagMediaEpisode(media: VideoMediaItem, episode: VideoEpisodeItem): VideoMediaItem {
  return {
    ...media,
    item_id: media.item_id ?? episode.item_id,
    video_episode_id: media.video_episode_id ?? String(episode.episode_id),
    video_season_id: media.video_season_id ?? String(episode.season_id)
  };
}

function tagSubtitleEpisode(subtitle: VideoSubtitleItem, episode: VideoEpisodeItem): VideoSubtitleItem {
  return {
    ...subtitle,
    item_id: subtitle.item_id ?? episode.item_id,
    video_episode_id: subtitle.video_episode_id ?? String(episode.episode_id),
    video_season_id: subtitle.video_season_id ?? String(episode.season_id)
  };
}

type PendingMediaAction =
  | { type: "rename-media"; media: VideoMediaItem }
  | { type: "move-media"; media: VideoMediaItem }
  | { type: "delete-media"; media: VideoMediaItem }
  | { type: "rename-subtitle"; subtitle: VideoSubtitleItem }
  | { type: "delete-subtitle"; subtitle: VideoSubtitleItem }
  | null;

export default function MediaDetailPage() {
  const { token } = useUserConsole();
  const params = useParams<{ id: string }>();
  const videoId = params.id;
  const [video, setVideo] = useState<VideoListItem | null>(null);
  const [seasons, setSeasons] = useState<VideoSeasonItem[]>([]);
  const [episodes, setEpisodes] = useState<VideoEpisodeItem[]>([]);
  const [mediaItems, setMediaItems] = useState<VideoMediaItem[]>([]);
  const [subtitles, setSubtitles] = useState<VideoSubtitleItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingMediaAction>(null);
  const [dialogInput, setDialogInput] = useState("");
  const [message, setMessage] = useState("");

  const selectedSeasonItem = useMemo(() => seasons.find((item) => String(item.season_number) === selectedSeason) || null, [seasons, selectedSeason]);
  const filteredEpisodes = selectedSeason ? episodes.filter((item) => String(item.season_number) === selectedSeason) : episodes;
  const filteredMediaItems = selectedEpisode ? mediaItems.filter((item) => textValue(item.video_episode_id, "") === selectedEpisode || textValue(item.item_id, "") === selectedEpisode) : mediaItems;
  const filteredSubtitles = selectedEpisode ? subtitles.filter((item) => textValue(item.video_episode_id, "") === selectedEpisode || textValue(item.item_id, "") === selectedEpisode) : subtitles;

  const loadDetail = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      const [videoResponse, seasonResponse, episodeResponse] = await Promise.all([
        getVideoList({ video_id: videoId, page: 1, page_size: 1 }, token),
        getVideoSeasons(videoId, token),
        getVideoEpisodes(videoId, undefined, token)
      ]);
      const mediaEpisodes = episodeResponse.filter((episode) => (episode.medias_count || 0) > 0);
      const subtitleEpisodes = episodeResponse.filter((episode) => (episode.subtitles_count || 0) > 0);
      const [mediaResponse, subtitleResponse] = await Promise.all([
        mediaEpisodes.length > 0
          ? Promise.all(mediaEpisodes.map(async (episode) => (await getMediaList({ video_list_id: videoId, video_episode_id: String(episode.episode_id) }, token)).map((item) => tagMediaEpisode(item, episode)))).then((items) => items.flat())
          : getMediaList({ video_list_id: videoId }, token),
        subtitleEpisodes.length > 0
          ? Promise.all(subtitleEpisodes.map(async (episode) => (await getSubtitleList({ video_list_id: videoId, video_episode_id: String(episode.episode_id) }, token)).map((item) => tagSubtitleEpisode(item, episode)))).then((items) => items.flat())
          : getSubtitleList({ video_list_id: videoId }, token)
      ]);

      setVideo(videoResponse.items[0] || null);
      setSeasons(seasonResponse);
      setEpisodes(episodeResponse);
      setMediaItems(mediaResponse);
      setSubtitles(subtitleResponse);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "媒体详情加载失败");
    }
  }, [token, videoId]);

  const loadResourceLists = useCallback(async (sourceEpisodes = episodes) => {
    const mediaEpisodes = sourceEpisodes.filter((episode) => (episode.medias_count || 0) > 0);
    const subtitleEpisodes = sourceEpisodes.filter((episode) => (episode.subtitles_count || 0) > 0);

    const [mediaResponse, subtitleResponse] = await Promise.all([
      mediaEpisodes.length > 0
        ? Promise.all(mediaEpisodes.map(async (episode) => (await getMediaList({ video_list_id: videoId, video_episode_id: String(episode.episode_id) }, token)).map((item) => tagMediaEpisode(item, episode)))).then((items) => items.flat())
        : getMediaList({ video_list_id: videoId }, token),
      subtitleEpisodes.length > 0
        ? Promise.all(subtitleEpisodes.map(async (episode) => (await getSubtitleList({ video_list_id: videoId, video_episode_id: String(episode.episode_id) }, token)).map((item) => tagSubtitleEpisode(item, episode)))).then((items) => items.flat())
        : getSubtitleList({ video_list_id: videoId }, token)
    ]);

    setMediaItems(mediaResponse);
    setSubtitles(subtitleResponse);
  }, [episodes, token, videoId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDetail]);

  function runAction(key: string, executor: () => Promise<string>) {
    void (async () => {
      setAction(key);
      setMessage("");

      try {
        const result = await executor();
        setMessage(result);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "操作失败");
      } finally {
        setAction("idle");
      }
    })();
  }

  function handleCopyPlayUrl(media: VideoMediaItem) {
    runAction(`play-${media.media_id}`, async () => {
      const result = await getMediaPlayUrl({ media_id: media.media_id }, token);
      await navigator.clipboard.writeText(result.url);
      return "播放地址已复制，本次获取可能会按直连/反代规则扣除萝卜，请留意萝卜记录";
    });
  }

  function handleRenameMedia(media: VideoMediaItem) {
    setDialogInput(mediaTitle(media));
    setPendingAction({ type: "rename-media", media });
  }

  function submitRenameMedia(media: VideoMediaItem) {
    const nextName = dialogInput.trim();

    if (!nextName) {
      setMessage("资源名称不能为空");
      return;
    }

    runAction(`rename-media-${media.media_id}`, async () => {
      await renameMedia({ media_id: media.media_id, name: nextName }, token);
      setPendingAction(null);
      await loadResourceLists();
      return "资源已重命名";
    });
  }

  function handleMoveMedia(media: VideoMediaItem) {
    setDialogInput("");
    setPendingAction({ type: "move-media", media });
  }

  function submitMoveMedia(media: VideoMediaItem) {
    const targetItemId = dialogInput.trim();

    if (!targetItemId) {
      setMessage("目标项目 ID 不能为空");
      return;
    }

    const itemType = itemTypeFromId(targetItemId);

    if (!itemType) {
      setMessage("目标项目 ID 必须以 vl-、vs- 或 ve- 开头");
      return;
    }

    runAction(`move-media-${media.media_id}`, async () => {
      await moveMedia({ media_id: media.media_id, item_type: itemType, item_id: targetItemId }, token);
      setPendingAction(null);
      await loadResourceLists();
      return "资源已移动";
    });
  }

  function handleDeleteMedia(media: VideoMediaItem) {
    setPendingAction({ type: "delete-media", media });
  }

  function submitDeleteMedia(media: VideoMediaItem) {
    runAction(`delete-media-${media.media_id}`, async () => {
      await deleteMedia({ media_id: media.media_id, reason: null }, token);
      setPendingAction(null);
      await loadResourceLists();
      return "资源已删除";
    });
  }

  function handleRenameSubtitle(subtitle: VideoSubtitleItem) {
    setDialogInput(subtitleTitle(subtitle));
    setPendingAction({ type: "rename-subtitle", subtitle });
  }

  function submitRenameSubtitle(subtitle: VideoSubtitleItem) {
    const nextTitle = dialogInput.trim();

    if (!nextTitle) {
      setMessage("字幕标题不能为空");
      return;
    }

    runAction(`rename-subtitle-${subtitle.subtitle_id}`, async () => {
      await renameSubtitle({ subtitle_id: subtitle.subtitle_id, title: nextTitle }, token);
      setPendingAction(null);
      await loadResourceLists();
      return "字幕已重命名";
    });
  }

  function handleDeleteSubtitle(subtitle: VideoSubtitleItem) {
    setPendingAction({ type: "delete-subtitle", subtitle });
  }

  function submitDeleteSubtitle(subtitle: VideoSubtitleItem) {
    runAction(`delete-subtitle-${subtitle.subtitle_id}`, async () => {
      await deleteSubtitle({ subtitle_id: subtitle.subtitle_id, reason: null }, token);
      setPendingAction(null);
      await loadResourceLists();
      return "字幕已删除";
    });
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <Link href="/user/media" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回媒体库
        </Link>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Film className="h-3.5 w-3.5" />
              Media Detail
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{videoTitle(video, videoId)}</h1>
            <p className="mt-3 max-w-5xl text-sm leading-6 text-muted-foreground">{video?.video_description || "加载媒体基础信息、季集结构、资源与字幕管理能力。"}</p>
          </div>
          <button type="button" onClick={() => void loadDetail()} disabled={status === "loading" || action !== "idle"} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="p-4 text-sm text-muted-foreground">{message}</GlassPanel> : null}
      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载媒体详情...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "媒体详情加载失败"}</GlassPanel> : null}

      {status === "ready" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <GlassPanel className="overflow-hidden p-0">
              <div className="aspect-[2/3] bg-muted/25">
                {video?.video_image_poster ? <div role="img" aria-label={videoTitle(video, videoId)} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${video.video_image_poster})` }} /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No Poster</div>}
              </div>
            </GlassPanel>
            <GlassPanel className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/50 bg-muted/15 p-4"><div className="text-xs text-muted-foreground">类型</div><div className="mt-2 font-semibold">{video?.video_type === "tv" ? "剧集" : video?.video_type === "movie" ? "电影" : "未知"}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/15 p-4"><div className="text-xs text-muted-foreground">首播/上映</div><div className="mt-2 font-semibold">{textValue(video?.video_date_air)}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/15 p-4"><div className="text-xs text-muted-foreground">资源数</div><div className="mt-2 font-mono font-semibold">{textValue(video?.medias_count, "0")}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/15 p-4"><div className="text-xs text-muted-foreground">字幕数</div><div className="mt-2 font-mono font-semibold">{textValue(video?.subtitles_count, "0")}</div></div>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <div>TMDB：{textValue(video?.tmdb_id)}</div>
                <div>TODB：{textValue(video?.todb_id)}</div>
                <div>Video ID：{videoId}</div>
                <div>Item ID：{textValue(video?.item_id)}</div>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><ListTree className="h-4 w-4" />季集结构</div>
                <p className="mt-1 text-sm text-muted-foreground">选择季或集后可聚焦查看对应资源与字幕。</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={selectedSeason} onChange={(event) => { setSelectedSeason(event.target.value); setSelectedEpisode(""); }} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                  <option value="">全部季</option>
                  {seasons.map((season) => <option key={season.item_id} value={season.season_number}>第 {season.season_number} 季 · {season.season_title}</option>)}
                </select>
                <select value={selectedEpisode} onChange={(event) => setSelectedEpisode(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                  <option value="">全部集</option>
                  {filteredEpisodes.map((episode) => <option key={episode.item_id} value={episode.item_id}>S{episode.season_number}E{episode.episode_number} · {episode.episode_title}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(selectedSeasonItem ? [selectedSeasonItem] : seasons).map((season) => (
                <div key={season.item_id} className="rounded-2xl border border-border/55 bg-background/35 p-4">
                  <div className="text-sm font-semibold">第 {season.season_number} 季 · {season.season_title}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{textValue(season.date_air)} · {season.episodes_count || 0} 集 · {season.has_media ? "有资源" : "暂无资源"}</div>
                </div>
              ))}
              {seasons.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">暂无季信息</div> : null}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">资源列表</div>
                <p className="mt-1 text-sm text-muted-foreground">播放地址只复制到剪贴板，不自动打开外链；获取地址可能按直连/反代规则扣除萝卜。</p>
              </div>
              <div className="text-xs text-muted-foreground">{filteredMediaItems.length} 项</div>
            </div>
            <div className="mt-4 space-y-3">
              {filteredMediaItems.map((media) => (
                <div key={media.media_id} className="rounded-2xl border border-border/55 bg-background/35 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-6">{mediaEpisodeLabel(media, episodes)}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{mediaTechnicalLine(media)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button type="button" onClick={() => handleCopyPlayUrl(media)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"><Copy className="h-3.5 w-3.5" />复制播放地址</button>
                      <button type="button" onClick={() => handleRenameMedia(media)} disabled={action !== "idle"} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50">重命名</button>
                      <button type="button" onClick={() => handleMoveMedia(media)} disabled={action !== "idle"} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50">移动</button>
                      <button type="button" onClick={() => handleDeleteMedia(media)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-danger/35 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />删除</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMediaItems.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">暂无资源</div> : null}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><Subtitles className="h-4 w-4" />字幕列表</div>
                <p className="mt-1 text-sm text-muted-foreground">支持重命名与删除字幕，删除前会二次确认。</p>
              </div>
              <div className="text-xs text-muted-foreground">{filteredSubtitles.length} 项</div>
            </div>
            <div className="mt-4 space-y-3">
              {filteredSubtitles.map((subtitle) => (
                <div key={subtitle.subtitle_id} className="rounded-2xl border border-border/55 bg-background/35 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{subtitleTitle(subtitle)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{textValue(subtitle.subtitle_codec)} · 上传者 {textValue(subtitle.user_pseudonym)} · {textValue(subtitle.created_at)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button type="button" onClick={() => handleRenameSubtitle(subtitle)} disabled={action !== "idle"} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50">重命名</button>
                      <button type="button" onClick={() => handleDeleteSubtitle(subtitle)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-danger/35 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />删除</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredSubtitles.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">暂无字幕</div> : null}
            </div>
          </GlassPanel>
        </>
      ) : null}
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "rename-media"
            ? "重命名资源"
            : pendingAction?.type === "move-media"
              ? "移动资源"
              : pendingAction?.type === "delete-media"
                ? "确认删除资源"
                : pendingAction?.type === "rename-subtitle"
                  ? "重命名字幕"
                  : "确认删除字幕"
        }
        description={
          pendingAction?.type === "rename-media"
            ? `为资源「${mediaTitle(pendingAction.media)}」设置新的名称。`
            : pendingAction?.type === "move-media"
              ? `将资源「${mediaTitle(pendingAction.media)}」移动到目标项目。`
              : pendingAction?.type === "delete-media"
                ? `将删除资源「${mediaTitle(pendingAction.media)}」。`
                : pendingAction?.type === "rename-subtitle"
                  ? `为字幕「${subtitleTitle(pendingAction.subtitle)}」设置新的标题。`
                  : pendingAction?.type === "delete-subtitle"
                    ? `将删除字幕「${subtitleTitle(pendingAction.subtitle)}」。`
                    : undefined
        }
        inputLabel={
          pendingAction?.type === "rename-media"
            ? "资源名称"
            : pendingAction?.type === "move-media"
              ? "目标项目 ID，例如 vl-1、vs-2 或 ve-3"
              : pendingAction?.type === "rename-subtitle"
                ? "字幕标题"
                : undefined
        }
        inputValue={pendingAction?.type === "rename-media" || pendingAction?.type === "move-media" || pendingAction?.type === "rename-subtitle" ? dialogInput : undefined}
        inputPlaceholder={pendingAction?.type === "move-media" ? "ve-1" : undefined}
        onInputChange={setDialogInput}
        confirmLabel={
          pendingAction?.type === "rename-media" || pendingAction?.type === "rename-subtitle"
            ? "保存名称"
            : pendingAction?.type === "move-media"
              ? "移动资源"
              : pendingAction?.type === "delete-media"
                ? "删除资源"
                : "删除字幕"
        }
        loading={action !== "idle"}
        tone={pendingAction?.type === "delete-media" || pendingAction?.type === "delete-subtitle" ? "danger" : "default"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.type === "rename-media") {
            submitRenameMedia(pendingAction.media);
          } else if (pendingAction?.type === "move-media") {
            submitMoveMedia(pendingAction.media);
          } else if (pendingAction?.type === "delete-media") {
            submitDeleteMedia(pendingAction.media);
          } else if (pendingAction?.type === "rename-subtitle") {
            submitRenameSubtitle(pendingAction.subtitle);
          } else if (pendingAction?.type === "delete-subtitle") {
            submitDeleteSubtitle(pendingAction.subtitle);
          }
        }}
      />
    </div>
  );
}
