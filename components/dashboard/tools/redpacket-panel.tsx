"use client";

import { Copy, Gift, Loader2, Search } from "lucide-react";
import { useState } from "react";
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

export function RedPacketPanel() {
  const { token, user } = useUserConsole();
  const [type, setType] = useState<"default" | "password">("default");
  const [receive, setReceive] = useState<"average" | "random">("average");
  const [carrot, setCarrot] = useState("");
  const [number, setNumber] = useState("");
  const [blessing, setBlessing] = useState("恭喜发财");
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [seconds, setSeconds] = useState("86400");
  const [creating, setCreating] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<RedPacketCreatePayload | null>(null);
  const [createMessage, setCreateMessage] = useState("");
  const [createdId, setCreatedId] = useState("");

  const [queryId, setQueryId] = useState("");
  const [records, setRecords] = useState<RedPacketReceiveItem[]>([]);
  const [queryStatus, setQueryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [queryMessage, setQueryMessage] = useState("");

  async function handleCreate() {
    const carrotValue = Number(carrot);
    const numberValue = Number(number);
    const secondsValue = Number(seconds);

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

    const payload: RedPacketCreatePayload = {
      type,
      receive,
      carrot: carrotValue,
      number: numberValue,
      blessing: blessing.trim(),
      text: type === "password" ? text.trim() : null,
      file_url: fileUrl.trim() || null,
      file_type: fileUrl.trim() ? inferFileType(fileUrl.trim(), fileType) : null,
      is_exclusive: false,
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
      setPendingCreate(null);
      setCreateMessage("红包创建成功");
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "红包创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleQuery() {
    const id = queryId.trim();

    if (!id) {
      setQueryMessage("请输入红包 ID");
      return;
    }

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

  async function handleCopyId() {
    if (!createdId) {
      return;
    }

    await navigator.clipboard.writeText(createdId);
    setCreateMessage("红包 ID 已复制");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="h-4 w-4 text-muted-foreground" />
          发红包
        </div>
        <p className="mt-2 text-sm text-muted-foreground">支持普通/口令红包，均分或随机领取。</p>

        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">红包类型</span>
              <select value={type} onChange={(event) => setType(event.target.value as "default" | "password")} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="default">普通红包</option>
                <option value="password">口令红包</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">领取方式</span>
              <select value={receive} onChange={(event) => setReceive(event.target.value as "average" | "random")} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
                <option value="average">均分</option>
                <option value="random">随机</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">总金额（1-60000）</span>
              <input value={carrot} onChange={(event) => setCarrot(event.target.value)} type="number" min={1} max={60000} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">可领人数（1-10000）</span>
              <input value={number} onChange={(event) => setNumber(event.target.value)} type="number" min={1} max={10000} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-muted-foreground">寄语（50 字内）</span>
            <input value={blessing} onChange={(event) => setBlessing(event.target.value)} maxLength={50} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          {type === "password" ? (
            <label className="block">
              <span className="text-xs text-muted-foreground">口令（区分大小写，1-50 字）</span>
              <input value={text} onChange={(event) => setText(event.target.value)} maxLength={50} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
          ) : null}
          <label className="block">
            <span className="text-xs text-muted-foreground">有效时长（秒，60-172800）</span>
            <input value={seconds} onChange={(event) => setSeconds(event.target.value)} type="number" min={60} max={172800} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <TemporaryFileInput label="红包资源 URL，可手填或上传文件" value={fileUrl} emosId={user.user_id} accept="image/*,audio/*,video/*" onChange={(value) => { setFileUrl(value); setFileType(""); }} onUploadedFileType={setFileType} onMessage={setCreateMessage} />
          <button type="button" onClick={handleCreate} disabled={creating} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            {creating ? "创建中" : "发红包"}
          </button>
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
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4 text-muted-foreground" />
          领取记录
        </div>
        <p className="mt-2 text-sm text-muted-foreground">输入红包 ID 查看领取明细。</p>

        <div className="mt-5 flex gap-2">
          <input value={queryId} onChange={(event) => setQueryId(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleQuery()} placeholder="红包 ID" className="h-11 flex-1 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          <button type="button" onClick={handleQuery} disabled={queryStatus === "loading"} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">查询</button>
        </div>

        <div className="mt-4 space-y-2">
          {queryStatus === "loading" ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在查询</div> : null}
          {queryStatus === "error" ? <div className="py-6 text-sm text-danger">{queryMessage}</div> : null}
          {queryStatus === "ready" && records.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">暂无领取记录</div> : null}
          {records.map((record, index) => (
            <div key={`${record.user_id}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{record.username}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(record.receive_at)}</div>
              </div>
              <div className="shrink-0 text-sm font-semibold text-amber-500">{record.carrot} 萝卜</div>
            </div>
          ))}
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
