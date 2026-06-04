"use client";

import { ArrowLeft, ChevronDown, Copy, Database, Film, HardDrive, Info, ListTree, MoveRight, Pencil, RefreshCw, Subtitles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { deleteMedia, deleteSubtitle, getMediaList, getMediaPlayUrl, getSubtitleList, getVideoEpisodes, getVideoList, getVideoSeasons, moveMedia, renameMedia, renameSubtitle } from "@/lib/api/client";
import type { VideoEpisodeItem, VideoListItem, VideoMediaItem, VideoSeasonItem, VideoSubtitleItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { cn } from "@/lib/utils";

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

function formatDuration(value?: number | string | null) {
  if (typeof value === "string" && /^\d+:\d{2}:\d{2}/.test(value)) {
    const [hours = "0", minutes = "0", seconds = "0"] = value.split(":");
    const total = Number(hours) * 3600 + Number(minutes) * 60 + Number.parseFloat(seconds);
    return formatDuration(total);
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "未知时长";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainSeconds).padStart(2, "0")}`;
}

function mediaStatusLabel(status?: string | null) {
  if (status === "complete") return "已完成";
  if (status === "uploading") return "上传中";
  if (status === "error") return "异常";
  return status || "未知";
}

function episodeHasResource(episode: VideoEpisodeItem) {
  return (episode.medias_count || 0) > 0 || (episode.subtitles_count || 0) > 0;
}

function seasonEpisodes(season: VideoSeasonItem, episodes: VideoEpisodeItem[]) {
  return episodes.filter((episode) => String(episode.season_number) === String(season.season_number));
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function metadataStreams(media: VideoMediaItem) {
  return Array.isArray(media.media_file_metadata?.streams) ? media.media_file_metadata.streams : [];
}

function metadataFormat(media: VideoMediaItem) {
  const format = media.media_file_metadata?.format;
  return format && typeof format === "object" ? format : null;
}

function streamText(stream: Record<string, unknown>, key: string, fallback = "-") {
  return textValue(stream[key], fallback);
}

function streamTypeLabel(value: unknown) {
  if (value === "video") return "视频";
  if (value === "audio") return "音频";
  if (value === "subtitle") return "字幕";
  if (value === "attachment") return "附件";
  return textValue(value, "其他");
}

function streamTitle(stream: Record<string, unknown>) {
  const index = streamText(stream, "index", "?");
  const codec = streamText(stream, "codec_long_name", streamText(stream, "codec_name"));
  return `#${index} · ${codec}`;
}

function formatBitrate(value: unknown) {
  const bitrate = Number(value);

  if (!Number.isFinite(bitrate) || bitrate <= 0) {
    return "-";
  }

  if (bitrate < 1000 * 1000) {
    return `${Math.round(bitrate / 1000)} Kbps`;
  }

  return `${(bitrate / 1000 / 1000).toFixed(2)} Mbps`;
}

function formatFrameRate(value: unknown) {
  const text = textValue(value, "");

  if (!text || text === "0/0") {
    return "-";
  }

  const [numerator, denominator] = text.split("/").map(Number);

  if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
    const fps = numerator / denominator;
    return `${Number.isInteger(fps) ? fps.toFixed(0) : fps.toFixed(2)} fps`;
  }

  return `${text} fps`;
}

function formatSampleRate(value: unknown) {
  const sampleRate = Number(value);

  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return "-";
  }

  return `${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz`;
}

function streamTag(stream: Record<string, unknown>, key: string, fallback = "-") {
  const tags = stream.tags;

  if (!tags || typeof tags !== "object") {
    return fallback;
  }

  return textValue((tags as Record<string, unknown>)[key], fallback);
}

function streamDispositionFlag(stream: Record<string, unknown>, key: string) {
  const disposition = stream.disposition;

  if (!disposition || typeof disposition !== "object") {
    return false;
  }

  return Number((disposition as Record<string, unknown>)[key]) === 1;
}

function streamLanguage(stream: Record<string, unknown>) {
  return streamTag(stream, "language", "und");
}

function streamDuration(stream: Record<string, unknown>, format: Record<string, unknown> | null) {
  return formatDuration(textValue(stream.duration ?? format?.duration, "0"));
}

function StreamMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/45 bg-muted/10 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-xs font-semibold text-foreground">{value}</div>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function streamCount(streams: Record<string, unknown>[], type: string) {
  return streams.filter((stream) => stream.codec_type === type).length;
}

function metadataJson(media: VideoMediaItem) {
  return JSON.stringify(media.media_file_metadata ?? {}, null, 2);
}

function StreamCard({ stream, format }: { stream: Record<string, unknown>; format: Record<string, unknown> | null }) {
  const codecType = streamText(stream, "codec_type", "other");
  const isVideo = codecType === "video";
  const isAudio = codecType === "audio";
  const color = [streamText(stream, "color_space", ""), streamText(stream, "color_range", "")].filter(Boolean).join(" / ") || "-";
  const badges = [streamLanguage(stream), streamDispositionFlag(stream, "default") ? "default" : ""].filter(Boolean);

  return (
    <div className="rounded-2xl border border-border/55 bg-background/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{streamTypeLabel(codecType)}</span>
        <span className="min-w-0 truncate text-sm font-semibold">{streamTitle(stream)}</span>
        {badges.map((badge) => <span key={badge} className="rounded-full bg-muted/25 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{badge}</span>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {isVideo ? <StreamMeta label="分辨率" value={`${streamText(stream, "width")} x ${streamText(stream, "height")}`} /> : null}
        {isVideo ? <StreamMeta label="帧率" value={formatFrameRate(stream.avg_frame_rate ?? stream.r_frame_rate)} /> : null}
        {isVideo ? <StreamMeta label="码率" value={formatBitrate(stream.bit_rate ?? format?.bit_rate)} /> : null}
        {isVideo ? <StreamMeta label="像素格式" value={streamText(stream, "pix_fmt")} /> : null}
        {isVideo ? <StreamMeta label="比例" value={streamText(stream, "display_aspect_ratio", streamText(stream, "sample_aspect_ratio"))} /> : null}
        {isVideo ? <StreamMeta label="时长" value={streamDuration(stream, format)} /> : null}
        {isVideo ? <StreamMeta label="帧数" value={streamText(stream, "nb_frames")} /> : null}
        {isVideo ? <StreamMeta label="色彩" value={color} /> : null}
        {isAudio ? <StreamMeta label="声道" value={[streamText(stream, "codec_name", ""), streamText(stream, "channel_layout", streamText(stream, "channels", ""))].filter(Boolean).join(" / ") || "-"} /> : null}
        {isAudio ? <StreamMeta label="采样率" value={formatSampleRate(stream.sample_rate)} /> : null}
        {isAudio ? <StreamMeta label="码率" value={formatBitrate(stream.bit_rate ?? format?.bit_rate)} /> : null}
        {isAudio ? <StreamMeta label="采样格式" value={streamText(stream, "sample_fmt")} /> : null}
        {isAudio ? <StreamMeta label="时长" value={streamDuration(stream, format)} /> : null}
        {isAudio ? <StreamMeta label="帧数" value={streamText(stream, "nb_frames")} /> : null}
        {isAudio ? <StreamMeta label="语言" value={streamLanguage(stream)} /> : null}
        {isAudio ? <StreamMeta label="Handler" value={streamTag(stream, "handler_name")} /> : null}
        {!isVideo && !isAudio ? <StreamMeta label="码率" value={formatBitrate(stream.bit_rate)} /> : null}
        {!isVideo && !isAudio ? <StreamMeta label="时长" value={streamDuration(stream, format)} /> : null}
      </div>
    </div>
  );
}

function MediaDetailDialog({ media, episodes, onClose }: { media: VideoMediaItem | null; episodes: VideoEpisodeItem[]; onClose: () => void }) {
  if (!media) return null;

  const episode = findMediaEpisode(media, episodes);
  const streams = metadataStreams(media);
  const format = metadataFormat(media);
  const videoCount = streamCount(streams, "video");
  const audioCount = streamCount(streams, "audio");
  const streamSubtitleCount = streamCount(streams, "subtitle");
  const attachmentCount = streamCount(streams, "attachment");
  const rawMetadata = metadataJson(media);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-background/70 px-3 py-4 backdrop-blur-md sm:p-6">
      <button type="button" aria-label="关闭资源详情" className="fixed inset-0" onClick={onClose} />
      <div className="relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-background/95 shadow-2xl shadow-black/15 backdrop-blur-xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><HardDrive className="h-3.5 w-3.5" />Resource Insight</div>
            <h2 className="mt-2 truncate text-lg font-semibold tracking-tight">{mediaSpecTitle(media)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{episode ? `S${episode.season_number}E${episode.episode_number} · ${episode.episode_title}` : mediaEpisodeLabel(media, episodes)}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailStat label="状态" value={mediaStatusLabel(media.media_status)} />
            <DetailStat label="文件大小" value={formatFileSize(media.media_file_size)} />
            <DetailStat label="时长" value={formatDuration(media.media_file_second)} />
            <DetailStat label="字幕" value={`${media.subtitle_count || 0} 条`} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-border/55 bg-background/35 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Info className="h-4 w-4" />媒体概览</div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">资源 ID：</span><span className="font-mono">{media.media_id}</span></div>
                <div><span className="text-muted-foreground">上传者：</span>{textValue(media.user_pseudonym)}</div>
                <div><span className="text-muted-foreground">存储：</span>{textValue(media.storage_title)}</div>
                <div><span className="text-muted-foreground">创建时间：</span>{formatDateTime(media.created_at)}</div>
                <div><span className="text-muted-foreground">封装：</span>{format ? textValue(format.format_long_name, textValue(format.format_name)) : "-"}</div>
                <div><span className="text-muted-foreground">整体码率：</span>{formatBitrate(format?.bit_rate)}</div>
                <div><span className="text-muted-foreground">流数量：</span>{textValue(format?.nb_streams, String(streams.length))}</div>
                <div><span className="text-muted-foreground">探测分：</span>{textValue(format?.probe_score)}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/55 bg-background/35 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Database className="h-4 w-4" />流统计</div>
              <p className="mt-2 text-xs text-muted-foreground">视频、音频、字幕与内嵌附件</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <DetailStat label="视频" value={`${videoCount}`} />
                <DetailStat label="音频" value={`${audioCount}`} />
                <DetailStat label="字幕" value={`${streamSubtitleCount}`} />
                <DetailStat label="附件" value={`${attachmentCount}`} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-border/55 bg-background/35 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Database className="h-4 w-4" />流明细</div>
            {streams.length > 0 ? (
              <div className="mt-4 space-y-3">
                {streams.map((stream, index) => <StreamCard key={`${streamText(stream, "index", String(index))}-${index}`} stream={stream} format={format} />)}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm leading-6 text-muted-foreground">
                暂无可展示的流明细。
              </div>
            )}
          </div>

          <details className="group mt-4 rounded-3xl border border-border/55 bg-background/35 p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
              <span className="flex items-center gap-2"><Database className="h-4 w-4" />原始元数据 JSON</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <pre className="mt-4 max-h-96 overflow-auto rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
              {rawMetadata}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
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
  const [expandedSeasons, setExpandedSeasons] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingMediaAction>(null);
  const [selectedMediaDetail, setSelectedMediaDetail] = useState<VideoMediaItem | null>(null);
  const [dialogInput, setDialogInput] = useState("");
  const [message, setMessage] = useState("");

  const filteredMediaItems = selectedEpisode ? mediaItems.filter((item) => textValue(item.video_episode_id, "") === selectedEpisode || textValue(item.item_id, "") === selectedEpisode) : mediaItems;
  const filteredSubtitles = selectedEpisode ? subtitles.filter((item) => textValue(item.video_episode_id, "") === selectedEpisode || textValue(item.item_id, "") === selectedEpisode) : subtitles;

  function toggleSeasonExpand(seasonNumber: number) {
    const key = String(seasonNumber);
    setExpandedSeasons((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

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
          ? Promise.all(mediaEpisodes.map(async (episode) => (await getMediaList({ video_list_id: videoId, video_season_id: String(episode.season_id), video_episode_id: String(episode.episode_id), include_metadata: 1 }, token)).map((item) => tagMediaEpisode(item, episode)))).then((items) => items.flat())
          : getMediaList({ video_list_id: videoId, include_metadata: 1 }, token),
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
        ? Promise.all(mediaEpisodes.map(async (episode) => (await getMediaList({ video_list_id: videoId, video_season_id: String(episode.season_id), video_episode_id: String(episode.episode_id), include_metadata: 1 }, token)).map((item) => tagMediaEpisode(item, episode)))).then((items) => items.flat())
        : getMediaList({ video_list_id: videoId, include_metadata: 1 }, token),
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
      return "播放地址已复制，本次获取会扣除萝卜，请留意萝卜记录";
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
      <PageToast message={status === "error" ? "" : message} onClose={() => setMessage("")} />
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
                <div className="flex items-center gap-2 text-sm font-semibold"><ListTree className="h-4 w-4" />季集导航</div>
                <p className="mt-1 text-sm text-muted-foreground">以季为单位浏览集数，资源集会被高亮；点击集数后下方资源与字幕同步聚焦。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setSelectedSeason(""); setSelectedEpisode(""); }} className={cn("h-9 rounded-full border px-4 text-xs font-semibold transition-colors", !selectedSeason && !selectedEpisode ? "border-foreground bg-foreground text-background" : "border-border/70 hover:bg-muted/40")}>全部</button>
                <button type="button" onClick={() => setSelectedEpisode("")} disabled={!selectedEpisode} className="h-9 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45">清除集筛选</button>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {seasons.map((season) => {
                const items = seasonEpisodes(season, episodes);
                const seasonKey = String(season.season_number);
                const activeSeason = seasonKey === selectedSeason;
                const expanded = expandedSeasons.includes(seasonKey);
                const resourceCount = items.reduce((count, episode) => count + (episode.medias_count || 0), 0);

                return (
                  <div key={season.item_id} className={cn("relative overflow-hidden rounded-3xl border p-4 transition-colors", activeSeason ? "border-primary/35 bg-primary/5" : "border-border/55 bg-background/35 hover:border-border/80")}>
                    {activeSeason ? <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-primary" /> : null}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <button type="button" onClick={() => { setSelectedSeason(activeSeason ? "" : seasonKey); setSelectedEpisode(""); }} className="group flex min-w-0 items-center gap-3 text-left">
                        <span className={cn("inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border px-3 text-xs font-bold transition-colors", activeSeason ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-muted/15 group-hover:bg-muted/30")}>S{season.season_number}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{season.season_title || `第 ${season.season_number} 季`}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{textValue(season.date_air)} · {items.length || season.episodes_count || 0} 集 · {resourceCount > 0 || season.has_media ? "有资源" : "暂无资源"}</span>
                        </span>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1">资源 {resourceCount}</span>
                        <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1">字幕 {items.reduce((count, episode) => count + (episode.subtitles_count || 0), 0)}</span>
                        <button type="button" onClick={() => toggleSeasonExpand(season.season_number)} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/45 px-3 py-1 font-semibold text-foreground transition-colors hover:bg-muted/35">
                          {expanded ? "收起" : "展开"}
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : "")} />
                        </button>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {items.map((episode) => {
                          const activeEpisode = selectedEpisode === episode.item_id;
                          const hasResource = episodeHasResource(episode);

                          return (
                            <button
                              key={episode.item_id}
                              type="button"
                              onClick={() => { setSelectedSeason(String(episode.season_number)); setSelectedEpisode(activeEpisode ? "" : episode.item_id); }}
                              title={episode.episode_title}
                              className={cn(
                                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
                                activeEpisode
                                  ? "border-primary/45 bg-primary/10 text-primary shadow-sm shadow-primary/10"
                                  : hasResource
                                    ? "border-primary/25 bg-primary/5 text-foreground hover:bg-primary/10"
                                    : "border-border/65 bg-background/35 text-muted-foreground hover:bg-muted/35 hover:text-foreground"
                              )}
                            >
                              <span>E{episode.episode_number}</span>
                              {hasResource ? <span className={cn("h-1.5 w-1.5 rounded-full", activeEpisode ? "bg-primary" : "bg-primary/70")} /> : null}
                            </button>
                          );
                        })}
                        {items.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">暂无集信息</div> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {seasons.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">暂无季信息</div> : null}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">资源列表</div>
                <p className="mt-1 text-sm text-muted-foreground">播放地址只复制到剪贴板，不自动打开外链；获取地址会扣除萝卜。</p>
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
                      <button type="button" onClick={() => setSelectedMediaDetail(media)} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40"><Info className="h-3.5 w-3.5" />详情</button>
                      <button type="button" onClick={() => handleCopyPlayUrl(media)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"><Copy className="h-3.5 w-3.5" />复制地址</button>
                      <button type="button" onClick={() => handleRenameMedia(media)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />重命名</button>
                      <button type="button" onClick={() => handleMoveMedia(media)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"><MoveRight className="h-3.5 w-3.5" />移动</button>
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
                      <button type="button" onClick={() => handleRenameSubtitle(subtitle)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />重命名</button>
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
      <MediaDetailDialog media={selectedMediaDetail} episodes={episodes} onClose={() => setSelectedMediaDetail(null)} />
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
