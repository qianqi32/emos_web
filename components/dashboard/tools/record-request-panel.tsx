"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getRecordRequest } from "@/lib/api/client";
import type { RecordRequestItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 20;
const ANOMALY_WINDOW_MS = 3 * 60 * 1000;
const ANOMALY_THRESHOLD = 5;

function formatDateTime(value: string) {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

function detectAnomalyKeys(items: RecordRequestItem[]) {
  const result = new Set<string>();
  const groups = new Map<string, Array<{ key: string; time: number }>>();

  items.forEach((item, index) => {
    const time = new Date(item.time.replace(" ", "T")).getTime();

    if (!item.video_media_id || Number.isNaN(time)) {
      return;
    }

    const records = groups.get(item.video_media_id) || [];
    records.push({ key: `${item.video_media_id}-${item.time}-${index}`, time });
    groups.set(item.video_media_id, records);
  });

  groups.forEach((records) => {
    records.sort((a, b) => a.time - b.time);

    for (let left = 0; left < records.length; left++) {
      let right = left;

      while (right < records.length && records[right].time - records[left].time <= ANOMALY_WINDOW_MS) {
        right++;
      }

      if (right - left > ANOMALY_THRESHOLD) {
        for (let index = left; index < right; index++) {
          result.add(records[index].key);
        }
      }
    }
  });

  return result;
}

export function RecordRequestPanel() {
  const { token } = useUserConsole();
  const [items, setItems] = useState<RecordRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const loadRecords = useCallback(
    async (targetPage: number) => {
      setStatus("loading");
      setMessage("");

      try {
        const result = await getRecordRequest({ page: targetPage, page_size: PAGE_SIZE }, token);
        setItems(result.items);
        setTotal(result.total);
        setPage(targetPage);
        setStatus("ready");
      } catch (error) {
        setItems([]);
        setTotal(0);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "请求记录加载失败");
      }
    },
    [token]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const anomalyKeys = detectAnomalyKeys(items);
  const anomalyCount = anomalyKeys.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">仅展示近一周记录，含资源、IP 与 UA，可用于排查异常请求。{anomalyCount > 0 ? ` 当前页发现 ${anomalyCount} 条疑似异常。` : ""}</p>
        <button type="button" onClick={() => void loadRecords(page)} disabled={status === "loading"} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {status === "loading" ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载请求记录
        </div>
      ) : null}
      {status === "error" ? <div className="py-8 text-sm text-danger">{message}</div> : null}
      {status === "ready" && items.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">近一周暂无请求记录</div> : null}

      {status === "ready" && items.length > 0 ? (
        <div>
          <div className="space-y-2">
            {items.map((item, index) => {
              const key = `${item.video_media_id}-${item.time}-${index}`;
              const isAnomaly = anomalyKeys.has(key);

              return (
                <div key={key} className={isAnomaly ? "rounded-2xl border border-danger/35 bg-danger/10 px-4 py-3" : "rounded-2xl border border-border/50 bg-muted/10 px-4 py-3"}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isAnomaly ? <AlertTriangle className="h-4 w-4 shrink-0 text-danger" /> : null}
                        <div className="truncate text-sm font-medium">{item.video_title}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.video_type === "tv" ? "剧集" : item.video_type === "movie" ? "电影" : item.video_type} · {formatDateTime(item.time)}</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {isAnomaly ? <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[10px] font-semibold text-danger">异常</span> : null}
                      {item.is_proxy ? <span className="rounded-full border border-info/25 bg-info/10 px-2.5 py-1 text-[10px] font-semibold text-info">反代</span> : null}
                    </div>
                  </div>
                  <div className="mt-2 break-all text-xs text-muted-foreground">IP {item.ip} · {item.ua}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>共 <span className="font-mono text-foreground">{total}</span> 条 · 第 {page}/{totalPages} 页</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadRecords(page - 1)} disabled={page <= 1} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">上一页</button>
              <button type="button" onClick={() => void loadRecords(page + 1)} disabled={page >= totalPages} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">下一页</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
