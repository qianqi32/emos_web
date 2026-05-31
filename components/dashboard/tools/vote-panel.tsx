"use client";

import { Copy, Loader2, Plus, Search, Trash2, Vote } from "lucide-react";
import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { createVote, getVoteResult } from "@/lib/api/client";
import type { VoteCreatePayload } from "@/lib/api/vote";
import type { VoteResultResponse } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

export function VotePanel() {
  const { token } = useUserConsole();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [seconds, setSeconds] = useState("3600");
  const [allowsRevoting, setAllowsRevoting] = useState(false);
  const [hideUntilClose, setHideUntilClose] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createdId, setCreatedId] = useState("");

  const [queryId, setQueryId] = useState("");
  const [result, setResult] = useState<VoteResultResponse | null>(null);
  const [queryStatus, setQueryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [queryMessage, setQueryMessage] = useState("");

  const tally = useMemo(() => {
    if (!result) {
      return [];
    }

    return result.options.map((option, index) => ({
      option,
      count: result.users.filter((user) => Number(user.option_index) === index).length,
    }));
  }, [result]);

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((item, i) => (i === index ? value : item)));
  }

  function addOption() {
    if (options.length >= 12) {
      return;
    }

    setOptions((current) => [...current, ""]);
  }

  function removeOption(index: number) {
    setOptions((current) => (current.length <= 2 ? current : current.filter((_, i) => i !== index)));
  }

  async function handleCreate() {
    if (!question.trim()) {
      setCreateMessage("请填写问题名称");
      return;
    }

    const cleanedOptions = options.map((option) => option.trim()).filter(Boolean);

    if (cleanedOptions.length < 2) {
      setCreateMessage("至少需要 2 个有效选项");
      return;
    }

    const secondsValue = Number(seconds);

    if (!Number.isInteger(secondsValue) || secondsValue < 60) {
      setCreateMessage("有效时长至少 60 秒");
      return;
    }

    const payload: VoteCreatePayload = {
      question: question.trim(),
      description: description.trim(),
      options: cleanedOptions,
      seconds: secondsValue,
      allows_revoting: allowsRevoting,
      hide_results_until_closes: hideUntilClose,
    };

    setCreating(true);
    setCreateMessage("");
    setCreatedId("");

    try {
      const response = await createVote(payload, token);
      setCreatedId(String(response.vote_id));
      setCreateMessage(`投票创建成功，结束时间 ${response.time_end}`);
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "投票创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleQuery() {
    const id = queryId.trim();

    if (!id) {
      setQueryMessage("请输入投票 ID");
      return;
    }

    setQueryStatus("loading");
    setQueryMessage("");

    try {
      const response = await getVoteResult(id, token);
      setResult(response);
      setQueryStatus("ready");
    } catch (error) {
      setResult(null);
      setQueryStatus("error");
      setQueryMessage(error instanceof Error ? error.message : "查询失败，仅可查看已结束的投票");
    }
  }

  async function handleCopyId() {
    if (!createdId) {
      return;
    }

    await navigator.clipboard.writeText(createdId);
    setCreateMessage("投票 ID 已复制");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Vote className="h-4 w-4 text-muted-foreground" />
          创建投票
        </div>
        <p className="mt-2 text-sm text-muted-foreground">2-12 个选项，有效时长最低 60 秒。</p>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-xs text-muted-foreground">问题名称（100 字内）</span>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={100} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">问题简介（200 字内）</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} rows={2} className="mt-2 w-full rounded-2xl border border-border/70 bg-background/50 px-4 py-2 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">选项（2-12 个）</span>
              <button type="button" onClick={addOption} disabled={options.length >= 12} className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" />
                添加选项
              </button>
            </div>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`选项 ${index + 1}`} className="h-10 flex-1 rounded-xl border border-border/70 bg-background/50 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 2} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/35 text-danger transition-colors hover:bg-danger/10 disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground">有效时长（秒，最低 60）</span>
            <input value={seconds} onChange={(event) => setSeconds(event.target.value)} type="number" min={60} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allowsRevoting} onChange={(event) => setAllowsRevoting(event.target.checked)} className="h-4 w-4" />
              允许撤回重投
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hideUntilClose} onChange={(event) => setHideUntilClose(event.target.checked)} className="h-4 w-4" />
              结束后才公布结果
            </label>
          </div>

          <button type="button" onClick={handleCreate} disabled={creating} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />}
            {creating ? "创建中" : "创建投票"}
          </button>
          {createdId ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3 text-sm">
              <span className="break-all font-mono text-foreground">投票 ID：{createdId}</span>
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
          投票结果
        </div>
        <p className="mt-2 text-sm text-muted-foreground">仅可查看已结束的投票。</p>

        <div className="mt-5 flex gap-2">
          <input value={queryId} onChange={(event) => setQueryId(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleQuery()} placeholder="投票 ID" className="h-11 flex-1 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          <button type="button" onClick={handleQuery} disabled={queryStatus === "loading"} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">查询</button>
        </div>

        <div className="mt-4 space-y-3">
          {queryStatus === "loading" ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在查询</div> : null}
          {queryStatus === "error" ? <div className="py-6 text-sm text-danger">{queryMessage}</div> : null}
          {queryStatus === "ready" && result ? (
            <>
              <div className="rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                <div className="text-sm font-semibold">{result.question}</div>
                <div className="mt-1 text-xs text-muted-foreground">{result.time_start} 至 {result.time_end} · 共 {result.users.length} 人参与</div>
              </div>
              {tally.map((item, index) => (
                <div key={index} className="rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{item.option}</span>
                    <span className="shrink-0 font-semibold text-blue-500">{item.count} 票</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/40">
                    <div className="h-full rounded-full bg-blue-500/70" style={{ width: result.users.length ? `${(item.count / result.users.length) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </GlassPanel>
    </div>
  );
}
