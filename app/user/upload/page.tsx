"use client";

import { CheckCircle2, FileText, Film, Loader2, Play, RefreshCw, Search, Trash2, UploadCloud, XCircle } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { getUploadToken, getVideoBaseInfo, getVideoEpisodes, getVideoList, saveSubtitleUpload, saveVideoUpload } from "@/lib/api/client";
import type { VideoEpisodeItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

type UploadKind = "video" | "subtitle";
type PendingStatus = "processing" | "ready" | "error";
type QueueStatus = "queue" | "uploading" | "success" | "error";

interface ParsedFileName {
  cleanTitle: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

interface PendingUploadFile {
  id: string;
  file: File;
  kind: UploadKind;
  status: PendingStatus;
  itemType: string;
  itemId: string;
  title: string;
  parsed: ParsedFileName;
  error: string;
}

interface QueueUploadItem extends Omit<PendingUploadFile, "status"> {
  status: QueueStatus;
  progress: number;
  uploadedBytes: number;
  error: string;
  result: string;
}

const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "mov", "webm", "m4v", "ts"];
const SUBTITLE_EXTENSIONS = ["srt", "ass", "ssa", "vtt"];
const CHUNK_SIZE = 200 * 1024 * 1024;

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function detectUploadKind(file: File): UploadKind | null {
  const extension = fileExtension(file.name);

  if (file.type.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension)) {
    return "video";
  }

  if (file.type.startsWith("text/") || SUBTITLE_EXTENSIONS.includes(extension)) {
    return "subtitle";
  }

  return null;
}

function parseFileName(fileName: string): ParsedFileName {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const seasonEpisodeMatch = baseName.match(/[.\s_-]S(\d{1,2})E(\d{1,3})/i);
  let cleanTitle = baseName
    .replace(/[.\s_-]S\d{1,2}E\d{1,3}.*/i, "")
    .replace(/\[[^\]]*]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(2160p|1080p|720p|WEB-DL|BluRay|HDTV|HEVC|H264|H265|x264|x265|AAC|FLAC|DTS|AC3)\b/gi, " ")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanTitle) {
    cleanTitle = baseName.trim();
  }

  return {
    cleanTitle,
    seasonNumber: seasonEpisodeMatch ? Number(seasonEpisodeMatch[1]) : null,
    episodeNumber: seasonEpisodeMatch ? Number(seasonEpisodeMatch[2]) : null
  };
}

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function numericItemId(itemId: string) {
  const value = itemId.replace(/[^0-9]/g, "");
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function itemTypeFromId(itemId: string) {
  if (itemId.startsWith("ve-")) {
    return "ve";
  }

  if (itemId.startsWith("vs-")) {
    return "vs";
  }

  return "vl";
}

function statusLabel(status: QueueStatus | PendingStatus) {
  const labels: Record<string, string> = {
    processing: "识别中",
    ready: "可上传",
    error: "失败",
    queue: "排队中",
    uploading: "上传中",
    success: "成功"
  };

  return labels[status] || status;
}

function uploadFile(file: File, uploadUrl: string, onProgress: (progress: number, uploadedBytes: number) => void) {
  return new Promise<void>((resolve, reject) => {
    let uploadedSize = 0;

    const uploadChunk = () => {
      if (uploadedSize >= file.size) {
        onProgress(100, file.size);
        resolve();
        return;
      }

      const chunkStart = uploadedSize;
      const chunkEnd = Math.min(uploadedSize + CHUNK_SIZE, file.size);
      const chunk = file.slice(chunkStart, chunkEnd);
      const request = new XMLHttpRequest();

      request.open("PUT", uploadUrl.replace(/[`]/g, ""));
      request.setRequestHeader("Accept", "*/*");
      request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      request.setRequestHeader("Content-Range", `bytes ${chunkStart}-${chunkEnd - 1}/${file.size}`);
      request.timeout = 600000;

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const currentUploaded = chunkStart + event.loaded;
          onProgress(Math.round((currentUploaded / file.size) * 100), currentUploaded);
        }
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          uploadedSize = chunkEnd;
          onProgress(Math.round((uploadedSize / file.size) * 100), uploadedSize);
          uploadChunk();
          return;
        }

        reject(new Error(`上传失败：${request.status} ${request.statusText || ""}`.trim()));
      };

      request.onerror = () => reject(new Error("上传失败：网络错误"));
      request.ontimeout = () => reject(new Error("上传失败：请求超时"));
      request.send(chunk);
    };

    uploadChunk();
  });
}

export default function UploadPage() {
  const { token, user } = useUserConsole();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingUploadFile[]>([]);
  const [queue, setQueue] = useState<QueueUploadItem[]>([]);
  const [message, setMessage] = useState("");
  const [activeAction, setActiveAction] = useState("idle");
  const [manualTitle, setManualTitle] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [manualKind, setManualKind] = useState<UploadKind>("video");

  const stats = useMemo(() => ({
    pending: pendingFiles.length,
    queue: queue.filter((item) => item.status === "queue").length,
    uploading: queue.filter((item) => item.status === "uploading").length,
    success: queue.filter((item) => item.status === "success").length,
    failed: queue.filter((item) => item.status === "error").length
  }), [pendingFiles.length, queue]);

  const resolveItem = useCallback(async (file: File, kind: UploadKind): Promise<PendingUploadFile> => {
    const parsed = parseFileName(file.name);
    const pendingFile: PendingUploadFile = {
      id: crypto.randomUUID(),
      file,
      kind,
      status: "processing",
      itemType: "vl",
      itemId: "",
      title: parsed.cleanTitle,
      parsed,
      error: ""
    };

    if (file.size <= 0) {
      return { ...pendingFile, status: "error", error: "文件为空，不能上传" };
    }

    if (!parsed.cleanTitle) {
      return { ...pendingFile, status: "error", error: "无法从文件名解析标题，请手动填写 item ID" };
    }

    try {
      const list = await getVideoList({ title: parsed.cleanTitle, page: 1, page_size: 10 }, token);
      const firstVideo = list.items[0];

      if (!firstVideo?.video_id) {
        return { ...pendingFile, status: "error", error: "未匹配到媒体，请手动填写 item ID" };
      }

      if (parsed.seasonNumber !== null && parsed.episodeNumber !== null) {
        const episodes = await getVideoEpisodes(String(firstVideo.video_id), { season_number: String(parsed.seasonNumber) }, token);
        const episode = episodes.find((entry: VideoEpisodeItem) => Number(entry.episode_number) === parsed.episodeNumber);

        if (episode?.item_id) {
          return {
            ...pendingFile,
            status: "ready",
            itemType: "ve",
            itemId: episode.item_id,
            title: `${firstVideo.video_title || parsed.cleanTitle} S${parsed.seasonNumber}E${parsed.episodeNumber}`
          };
        }
      }

      return {
        ...pendingFile,
        status: "ready",
        itemType: "vl",
        itemId: String(firstVideo.video_id),
        title: firstVideo.video_title || parsed.cleanTitle
      };
    } catch (error) {
      return { ...pendingFile, status: "error", error: error instanceof Error ? error.message : "自动识别失败" };
    }
  }, [token]);

  async function processFiles(files: File[]) {
    setMessage("");

    for (const file of files) {
      const kind = detectUploadKind(file);

      if (!kind) {
        setMessage(`已忽略不支持的文件：${file.name}`);
        continue;
      }

      const tempId = crypto.randomUUID();
      const parsed = parseFileName(file.name);
      const processingFile: PendingUploadFile = {
        id: tempId,
        file,
        kind,
        status: "processing",
        itemType: "vl",
        itemId: "",
        title: parsed.cleanTitle || file.name,
        parsed,
        error: ""
      };

      setPendingFiles((current) => [...current, processingFile]);
      const resolved = await resolveItem(file, kind);
      setPendingFiles((current) => current.map((item) => item.id === tempId ? { ...resolved, id: tempId } : item));
    }
  }

  function handleFileInput(files: FileList | null) {
    if (!files) {
      return;
    }

    void processFiles(Array.from(files));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function updatePending(id: string, patch: Partial<PendingUploadFile>) {
    setPendingFiles((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function removePending(id: string) {
    setPendingFiles((current) => current.filter((item) => item.id !== id));
  }

  function addReadyToQueue() {
    const readyFiles = pendingFiles.filter((item) => item.status === "ready" && item.itemId.trim());

    if (readyFiles.length === 0) {
      setMessage("没有可加入队列的文件，请先处理识别失败的项目");
      return;
    }

    setQueue((current) => [
      ...current,
      ...readyFiles.map((item): QueueUploadItem => ({
        ...item,
        itemType: itemTypeFromId(item.itemId),
        status: "queue",
        progress: 0,
        uploadedBytes: 0,
        error: "",
        result: ""
      }))
    ]);
    setPendingFiles((current) => current.filter((item) => !readyFiles.some((ready) => ready.id === item.id)));
    setMessage(`已加入 ${readyFiles.length} 个文件到上传队列`);
  }

  async function addManualItem() {
    const itemId = manualItemId.trim();
    const itemType = itemTypeFromId(itemId);
    const numericId = numericItemId(itemId);

    if (!manualTitle.trim() || !itemId || numericId === null) {
      setMessage("请填写标题和有效 item ID，例如 ve-1986 或 1986");
      return;
    }

    try {
      const baseInfo = await getVideoBaseInfo({ item_type: itemType, item_id: String(numericId) }, token);
      setPendingFiles((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          file: new File([], manualTitle.trim()),
          kind: manualKind,
          status: "error",
          itemType,
          itemId,
          title: baseInfo.title || manualTitle.trim(),
          parsed: { cleanTitle: manualTitle.trim(), seasonNumber: null, episodeNumber: null },
          error: "请通过文件选择添加真实文件后再上传；此项仅用于校验 item ID"
        }
      ]);
      setMessage(`item ID 校验成功：${baseInfo.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "item ID 校验失败");
    }
  }

  async function uploadQueueItem(item: QueueUploadItem) {
    const numericId = numericItemId(item.itemId);

    if (numericId === null) {
      throw new Error("item ID 必须包含有效数字");
    }

    const uploadToken = await getUploadToken({
      type: item.kind,
      file_type: item.file.type || (item.kind === "video" ? "video/mp4" : "text/plain"),
      file_name: item.file.name,
      file_size: item.file.size,
      file_storage: "default"
    }, token);

    if (!uploadToken.file_id || !uploadToken.data?.upload_url) {
      throw new Error("上传 token 返回不完整");
    }

    await uploadFile(item.file, uploadToken.data.upload_url, (progress, uploadedBytes) => {
      setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress, uploadedBytes } : entry));
    });

    if (item.kind === "video") {
      const result = await saveVideoUpload({ item_type: itemTypeFromId(item.itemId), item_id: numericId, file_id: uploadToken.file_id }, token);
      return `媒体 ${result.media_id}，获得 ${result.carrot} 萝卜`;
    }

    const result = await saveSubtitleUpload({ item_type: itemTypeFromId(item.itemId), item_id: numericId, file_id: uploadToken.file_id }, token);
    return `字幕 ${result.subtitle_id}，获得 ${result.carrot} 萝卜`;
  }

  function startUploadQueue() {
    if (activeAction !== "idle") {
      return;
    }

    const queuedItems = queue.filter((item) => item.status === "queue");

    if (queuedItems.length === 0) {
      setMessage("上传队列为空");
      return;
    }

    void (async () => {
      setActiveAction("upload");
      setMessage("");

      for (const item of queuedItems) {
        setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "uploading", error: "", result: "" } : entry));

        try {
          const result = await uploadQueueItem(item);
          setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "success", progress: 100, uploadedBytes: entry.file.size, result } : entry));
        } catch (error) {
          setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", error: error instanceof Error ? error.message : "上传失败" } : entry));
        }
      }

      setActiveAction("idle");
      setMessage("上传队列处理完成");
    })();
  }

  function retryQueueItem(id: string) {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, status: "queue", progress: 0, uploadedBytes: 0, error: "", result: "" } : item));
  }

  function removeQueueItem(id: string) {
    setQueue((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={message} onClose={() => setMessage("")} />
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <UploadCloud className="h-3.5 w-3.5" />
          Upload
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">上传视频与字幕</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">选择文件后自动解析标题与季集，匹配媒体条目，获取上传令牌并保存上传结果。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5 lg:flex">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">待确认 <span className="font-mono text-foreground">{stats.pending}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">队列 <span className="font-mono text-foreground">{stats.queue}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">上传中 <span className="font-mono text-foreground">{stats.uploading}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">成功 <span className="font-mono text-foreground">{stats.success}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">失败 <span className="font-mono text-foreground">{stats.failed}</span></div>
          </div>
        </div>
      </GlassPanel>

      {!user.is_can_upload ? <GlassPanel className="border-warning/30 p-4 text-sm text-warning">当前账号资料显示暂未开启上传权限，如接口返回无权限，请先在账号侧完成上传协议或权限申请。</GlassPanel> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GlassPanel className="p-4 sm:p-5">
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void processFiles(Array.from(event.dataTransfer.files)); }} className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/10 p-8 text-center transition-colors hover:bg-muted/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">拖拽视频或字幕到这里</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">支持视频：mp4、mkv、avi、mov、webm；字幕：srt、ass、ssa、vtt。文件名包含 S01E01 时会优先匹配具体集。</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.m4v,.ts,.srt,.ass,.ssa,.vtt" onChange={(event) => handleFileInput(event.target.files)} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90">
              <UploadCloud className="h-4 w-4" />
              选择文件
            </button>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4" />
            手动校验 item ID
          </div>
          <div className="mt-4 space-y-3">
            <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="标题备注" className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <input value={manualItemId} onChange={(event) => setManualItemId(event.target.value)} placeholder="item ID，例如 ve-1986" className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <select value={manualKind} onChange={(event) => setManualKind(event.target.value as UploadKind)} className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
              <option value="video">视频</option>
              <option value="subtitle">字幕</option>
            </select>
            <button type="button" onClick={() => void addManualItem()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40">
              <RefreshCw className="h-4 w-4" />
              校验
            </button>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">待确认文件</h2>
            <p className="mt-1 text-sm text-muted-foreground">识别失败的文件可以手动填写 item ID 后加入队列。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addReadyToQueue} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90">加入队列</button>
            <button type="button" onClick={() => setPendingFiles([])} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40">清空</button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {pendingFiles.length === 0 ? <div className="rounded-3xl border border-border/60 bg-muted/10 p-8 text-center text-sm text-muted-foreground">暂无待确认文件。</div> : null}
          {pendingFiles.map((item) => (
            <div key={item.id} className="rounded-3xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kind === "video" ? <Film className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    <h3 className="truncate text-sm font-semibold">{item.file.name}</h3>
                    <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{item.kind === "video" ? "视频" : "字幕"}</span>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{statusLabel(item.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatFileSize(item.file.size)} · {item.title || "未识别标题"}</p>
                  {item.error ? <p className="mt-2 text-xs text-danger">{item.error}</p> : null}
                </div>
                <button type="button" onClick={() => removePending(item.id)} className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                <select value={item.kind} onChange={(event) => updatePending(item.id, { kind: event.target.value as UploadKind })} className="h-10 rounded-full border border-border/70 bg-background/50 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                  <option value="video">视频</option>
                  <option value="subtitle">字幕</option>
                </select>
                <input value={item.title} onChange={(event) => updatePending(item.id, { title: event.target.value })} placeholder="标题" className="h-10 rounded-full border border-border/70 bg-background/50 px-3 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                <input value={item.itemId} onChange={(event) => updatePending(item.id, { itemId: event.target.value, itemType: itemTypeFromId(event.target.value), status: event.target.value.trim() ? "ready" : "error", error: event.target.value.trim() ? "" : "请填写 item ID" })} placeholder="item ID，例如 ve-1986" className="h-10 rounded-full border border-border/70 bg-background/50 px-3 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">上传队列</h2>
            <p className="mt-1 text-sm text-muted-foreground">队列会按顺序上传，上传成功后再调用保存结果接口。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={startUploadQueue} disabled={activeAction !== "idle"} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {activeAction === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              开始上传
            </button>
            <button type="button" onClick={() => setQueue([])} disabled={activeAction !== "idle"} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">清空</button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {queue.length === 0 ? <div className="rounded-3xl border border-border/60 bg-muted/10 p-8 text-center text-sm text-muted-foreground">上传队列为空。</div> : null}
          {queue.map((item) => (
            <div key={item.id} className="rounded-3xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kind === "video" ? <Film className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    <h3 className="truncate text-sm font-semibold">{item.file.name}</h3>
                    <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{item.itemType} · {item.itemId}</span>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{statusLabel(item.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.title} · {formatFileSize(item.file.size)} · 已上传 {formatFileSize(item.uploadedBytes)}</p>
                  {item.error ? <p className="mt-2 text-xs text-danger">{item.error}</p> : null}
                  {item.result ? <p className="mt-2 text-xs text-success">{item.result}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {item.status === "error" ? <button type="button" onClick={() => retryQueueItem(item.id)} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40"><RefreshCw className="h-3.5 w-3.5" /></button> : null}
                  <button type="button" onClick={() => removeQueueItem(item.id)} disabled={item.status === "uploading"} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/30">
                <div className={`h-full rounded-full ${item.status === "error" ? "bg-danger" : item.status === "success" ? "bg-success" : "bg-primary"}`} style={{ width: `${item.progress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.progress}%</span>
                <span>{item.status === "success" ? <CheckCircle2 className="h-4 w-4 text-success" /> : item.status === "error" ? <XCircle className="h-4 w-4 text-danger" /> : null}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
