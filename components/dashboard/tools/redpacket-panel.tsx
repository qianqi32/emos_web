"use client";

import { Copy, Gift, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TemporaryFileInput } from "@/components/ui/temporary-file-input";
import { createRedPacket, getRedPacketReceive } from "@/lib/api/client";
import type { RedPacketCreatePayload } from "@/lib/api/redpacket";
import type { RedPacketReceiveItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

function inferFileType(url: string, uploadedFileType: string) {
  if (uploadedFileType) {
    return uploadedFileType;
  }

  const lower = url.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/.test(lower)) return "image";
  if (/\.(mp3|m4a|aac|wav|ogg|flac)(\?|#|$)/.test(lower)) return "audio";
  if (/\.(mp4|m4v|mov|webm|mkv)(\?|#|$)/.test(lower)) return "video";
  return "file";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

function formatDuration(seconds: number | undefined) {
  if (!seconds) return "-";
  if (seconds % 86400 === 0) return `${seconds / 86400}天`;
  if (seconds % 3600 === 0) return `${seconds / 3600}小时`;
  if (seconds % 60 === 0) return `${seconds / 60}分钟`;
  return `${seconds}秒`;
}

function redPacketTypeLabel(type: "default" | "password") {
  return type === "password" ? "口令" : "普通";
}

function receiveLabel(receive: "average" | "random") {
  return receive === "random" ? "随机" : "均分";
}

interface LocalRedPacketRecord {
  red_packet_id: string;
  carrot: number;
  number: number;
  type: "default" | "password";
  receive: "average" | "random";
  blessing: string;
  text: string | null;
  file_url: string | null;
  file_type: string | null;
  is_exclusive: boolean;
  seconds: number;
  created_at: string;
}

const DEFAULT_COVER_URL = "https://img.030666.xyz/file/1779455878815_redpacket_cover_1779455873987.jpg";
const LOCAL_RECORDS_KEY = "emos-redpacket-records";
const MAX_LOCAL_RECORDS = 30;
const EXPIRE_OPTIONS = [
  { label: "1分钟", value: "60" },
  { label: "1小时", value: "3600" },
  { label: "24小时", value: "86400" },
  { label: "48小时", value: "172800" },
  { label: "自定义", value: "custom" }
] as const;

type ExpireOption = (typeof EXPIRE_OPTIONS)[number]["value"];
type ExpireUnit = "minute" | "hour";

const EXPIRE_UNIT_MULTIPLIER: Record<ExpireUnit, number> = {
  minute: 60,
  hour: 3600
};

function readLocalRecords() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(LOCAL_RECORDS_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is LocalRedPacketRecord => typeof item?.red_packet_id === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(records: LocalRedPacketRecord[]) {
  window.localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records.slice(0, MAX_LOCAL_RECORDS)));
}

export function RedPacketPanel() {
  const { token, user } = useUserConsole();
  const [type, setType] = useState<"default" | "password">("default");
  const [receive, setReceive] = useState<"average" | "random">("average");
  const [carrot, setCarrot] = useState("");
  const [number, setNumber] = useState("");
  const [blessing, setBlessing] = useState("");
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [useDefaultCover, setUseDefaultCover] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [expireOption, setExpireOption] = useState<ExpireOption>("86400");
  const [seconds, setSeconds] = useState("86400");
  const [customExpireValue, setCustomExpireValue] = useState("24");
  const [customExpireUnit, setCustomExpireUnit] = useState<ExpireUnit>("hour");
  const [creating, setCreating] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<RedPacketCreatePayload | null>(null);
  const [createMessage, setCreateMessage] = useState("");
  const [createdId, setCreatedId] = useState("");

  const [queryId, setQueryId] = useState("");
  const [records, setRecords] = useState<RedPacketReceiveItem[]>([]);
  const [queryStatus, setQueryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [queryMessage, setQueryMessage] = useState("");
  const [localRecords, setLocalRecords] = useState<LocalRedPacketRecord[]>(() => readLocalRecords());

  const filteredLocalRecords = useMemo(() => {
    const keyword = queryId.trim().toLowerCase();
    return keyword ? localRecords.filter((record) => record.red_packet_id.toLowerCase().includes(keyword)) : localRecords;
  }, [localRecords, queryId]);

  function saveLocalRecord(record: LocalRedPacketRecord) {
    setLocalRecords((current) => {
      const next = [record, ...current.filter((item) => item.red_packet_id !== record.red_packet_id)].slice(0, MAX_LOCAL_RECORDS);
      writeLocalRecords(next);
      return next;
    });
  }

  function clearLocalRecords() {
    window.localStorage.removeItem(LOCAL_RECORDS_KEY);
    setLocalRecords([]);
  }

  function handleExpireOptionChange(value: ExpireOption) {
    setExpireOption(value);
    if (value !== "custom") {
      setSeconds(value);
    }
  }

  function handleUseDefaultCoverChange(checked: boolean) {
    setUseDefaultCover(checked);
    if (checked) {
      setFileUrl("");
      setFileType("");
    } else {
      setFileUrl("");
      setFileType("");
    }
  }

  async function handleCreate() {
    const carrotValue = Number(carrot);
    const numberValue = Number(number);
    const customExpireNumber = Number(customExpireValue);
    const secondsValue = expireOption === "custom" ? customExpireNumber * EXPIRE_UNIT_MULTIPLIER[customExpireUnit] : Number(seconds);

    if (!Number.isInteger(carrotValue) || carrotValue < 1 || carrotValue > 60000) {
      setCreateMessage("红包总金额需为 1-60000 之间的整数");
      return;
    }

    if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 10000) {
      setCreateMessage("可领人数需为 1-10000 之间的整数");
      return;
    }

    if (!blessing.trim()) {
      setCreateMessage("请填写寄语");
      return;
    }

    if (type === "password" && !text.trim()) {
      setCreateMessage("口令红包必须填写口令");
      return;
    }

    if (!Number.isInteger(secondsValue) || secondsValue < 60 || secondsValue > 172800) {
      setCreateMessage("有效时长需为 60-172800 秒之间");
      return;
    }

    const nextFileUrl = useDefaultCover ? DEFAULT_COVER_URL : fileUrl.trim();
    const nextFileType = nextFileUrl ? inferFileType(nextFileUrl, useDefaultCover ? "image" : fileType) : null;

    const payload: RedPacketCreatePayload = {
      type,
      receive,
      carrot: carrotValue,
      number: numberValue,
      blessing: blessing.trim(),
      text: type === "password" ? text.trim() : null,
      file_url: nextFileUrl || null,
      file_type: nextFileType,
      is_exclusive: isExclusive,
      seconds: secondsValue,
    };

    setPendingCreate(payload);
  }

  async function submitCreate(payload: RedPacketCreatePayload) {
    setCreating(true);
    setCreateMessage("");
    setCreatedId("");

    try {
      const result = await createRedPacket(payload, token);
      setCreatedId(result.red_packet_id);
      saveLocalRecord({
        red_packet_id: result.red_packet_id,
        carrot: payload.carrot,
        number: payload.number,
        type: payload.type,
        receive: payload.receive,
        blessing: payload.blessing,
        text: payload.text,
        file_url: payload.file_url,
        file_type: payload.file_type,
        is_exclusive: payload.is_exclusive,
        seconds: payload.seconds,
        created_at: new Date().toISOString()
      });
      setPendingCreate(null);
      setCreateMessage("红包创建成功");
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "红包创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function runQuery(id: string) {
    setQueryStatus("loading");
    setQueryMessage("");

    try {
      const result = await getRedPacketReceive(id, token);
      setRecords(result.items);
      setQueryStatus("ready");
    } catch (error) {
      setRecords([]);
      setQueryStatus("error");
      setQueryMessage(error instanceof Error ? error.message : "查询失败");
    }
  }

  async function handleQuery() {
    const id = queryId.trim();

    if (!id) {
      setQueryMessage("请输入红包 ID");
      return;
    }

    await runQuery(id);
  }

  function refreshLocalRecords() {
    setLocalRecords(readLocalRecords());
  }

  async function refreshQueryRecords() {
    const id = queryId.trim();

    if (!id) {
      setQueryMessage("请输入红包 ID");
      return;
    }

    await runQuery(id);
  }

  async function handleCopyId() {
    if (!createdId) {
      return;
    }

    await navigator.clipboard.writeText(createdId);
    setCreateMessage("红包 ID 已复制");
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="h-4 w-4 text-muted-foreground" />
          发红包
        </div>
        <p className="mt-2 text-sm text-muted-foreground">支持普通/口令红包，均分或随机领取。</p>

        <div className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">类型</span>
              <select value={type} onChange={(event) => setType(event.target.value as "default" | "password")} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="default">普通红包</option>
                <option value="password">口令红包</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">领取模式</span>
              <select value={receive} onChange={(event) => setReceive(event.target.value as "average" | "random")} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="average">均分</option>
                <option value="random">随机</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">萝卜</span>
              <input value={carrot} onChange={(event) => setCarrot(event.target.value)} type="number" min={1} max={60000} placeholder="多发点" className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">可领人数</span>
              <input value={number} onChange={(event) => setNumber(event.target.value)} type="number" min={1} max={10000} placeholder="999" className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
          </div>

          <div className={type === "password" ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
            <label className="block">
              <span className="text-xs text-muted-foreground">寄语</span>
              <input value={blessing} onChange={(event) => setBlessing(event.target.value)} maxLength={50} placeholder="您要说点什么" className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            {type === "password" ? (
              <label className="block">
                <span className="text-xs text-muted-foreground">口令</span>
                <input value={text} onChange={(event) => setText(event.target.value)} maxLength={50} placeholder="领取口令，区分大小写" className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              </label>
            ) : null}
          </div>

          <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={isExclusive} onChange={(event) => setIsExclusive(event.target.checked)} className="h-4 w-4 accent-foreground" />
            独占模式（仅显示封面/音频）
          </label>

          <div>
            <span className="text-xs text-muted-foreground">过期时间</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPIRE_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => handleExpireOptionChange(option.value)} className={expireOption === option.value ? "rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background" : "rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"}>
                  {option.label}
                </button>
              ))}
            </div>
            {expireOption === "custom" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <input value={customExpireValue} onChange={(event) => setCustomExpireValue(event.target.value)} type="number" min={1} placeholder="输入时长" className="h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                <select value={customExpireUnit} onChange={(event) => setCustomExpireUnit(event.target.value as ExpireUnit)} className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                  <option value="minute">分钟</option>
                  <option value="hour">小时</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border/50 bg-muted/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">封面/音频（可选）</div>
                <div className="mt-1 text-xs text-muted-foreground">默认封面会随红包一起发送，直链或上传会覆盖默认封面。</div>
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                <input type="checkbox" checked={useDefaultCover} onChange={(event) => handleUseDefaultCoverChange(event.target.checked)} className="h-4 w-4 accent-foreground" />
                启用默认封面
              </label>
            </div>
            <div className="mt-4">
              <TemporaryFileInput label="文件直链 URL（会覆盖默认封面）" value={fileUrl} emosId={user.user_id} accept="image/*,audio/*" onChange={(value) => { setUseDefaultCover(false); setFileUrl(value); setFileType(""); }} onUploadedFileType={(value) => { setUseDefaultCover(false); setFileType(value); }} onMessage={setCreateMessage} />
            </div>
          </div>

          <div className="sticky bottom-3 z-20 -mx-1 rounded-[1.75rem] border border-border/70 bg-background/90 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
            <button type="button" onClick={handleCreate} disabled={creating} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              {creating ? "创建中" : "发红包"}
            </button>
          </div>
          {createdId ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3 text-sm">
              <span className="break-all font-mono text-foreground">{createdId}</span>
              <button type="button" onClick={handleCopyId} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40">
                <Copy className="h-3.5 w-3.5" />
                复制
              </button>
            </div>
          ) : null}
          {createMessage ? <div className="text-sm text-muted-foreground">{createMessage}</div> : null}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-muted-foreground" />
              查询与记录
            </div>
            <p className="mt-2 text-sm text-muted-foreground">一个红包 ID 输入框同时用于筛选本地记录和查询领取明细。</p>
          </div>
          <button type="button" onClick={clearLocalRecords} disabled={localRecords.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-danger/35 px-4 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />
            清空本地记录
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input value={queryId} onChange={(event) => setQueryId(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleQuery()} placeholder="输入红包 ID，筛选本地记录或查询领取明细" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          <button type="button" onClick={handleQuery} disabled={queryStatus === "loading"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">查询领取</button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-border/50 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">最近发出的红包</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{filteredLocalRecords.length} / {localRecords.length}</div>
                <button type="button" onClick={refreshLocalRecords} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {filteredLocalRecords.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">暂无匹配的本地记录</div> : null}
              {filteredLocalRecords.map((record) => (
                <div key={record.red_packet_id} className="rounded-2xl border border-border/50 bg-background/35 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{redPacketTypeLabel(record.type)}</span>
                        <span className="text-sm font-semibold text-foreground">{record.carrot} 萝卜 / {record.number} 人</span>
                      </div>
                      <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>寄语：<span className="text-foreground">{record.blessing}</span></div>
                        <div>领取类型：<span className="text-foreground">{receiveLabel(record.receive)}</span></div>
                        <div>有效期：<span className="text-foreground">{formatDuration(record.seconds)}</span></div>
                        <div>创建时间：<span className="text-foreground">{formatDateTime(record.created_at)}</span></div>
                        {record.text ? <div>口令：<span className="text-danger">{record.text}</span></div> : null}
                        {record.file_url ? <a href={record.file_url} target="_blank" rel="noreferrer" className="text-primary transition-colors hover:text-foreground">查看资源</a> : null}
                      </div>
                      <div className="mt-3 border-t border-border/50 pt-3 font-mono text-xs text-primary">红包 ID：{record.red_packet_id}</div>
                    </div>
                    <button type="button" onClick={() => { setQueryId(record.red_packet_id); void runQuery(record.red_packet_id); }} className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                      查询领取
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/50 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">领取明细</div>
              <div className="flex items-center gap-2">
                {queryStatus === "ready" ? <div className="text-xs text-muted-foreground">{records.length} 条</div> : null}
                <button type="button" onClick={() => void refreshQueryRecords()} disabled={queryStatus === "loading"} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50">
                  {queryStatus === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  刷新
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {queryStatus === "idle" ? <div className="py-8 text-center text-sm text-muted-foreground">输入红包 ID 后点击查询领取。</div> : null}
              {queryStatus === "loading" ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在查询</div> : null}
              {queryStatus === "error" ? <div className="py-8 text-sm text-danger">{queryMessage}</div> : null}
              {queryStatus === "ready" && records.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">暂无领取记录</div> : null}
              {records.map((record, index) => (
                <div key={`${record.user_id}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/35 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{record.username}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(record.receive_at)}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-amber-500">{record.carrot} 萝卜</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      <ConfirmDialog
        open={pendingCreate !== null}
        title="确认发红包"
        description={
          pendingCreate
            ? `将发出 ${pendingCreate.carrot} 萝卜的${pendingCreate.type === "password" ? "口令" : "普通"}红包，共 ${pendingCreate.number} 个名额，发出后将从余额扣除。`
            : undefined
        }
        confirmLabel="确认发出"
        loading={creating}
        tone="danger"
        onCancel={() => setPendingCreate(null)}
        onConfirm={() => {
          if (pendingCreate) {
            void submitCreate(pendingCreate);
          }
        }}
      />
    </div>
  );
}
