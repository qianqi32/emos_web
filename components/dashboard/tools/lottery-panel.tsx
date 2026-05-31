"use client";

import { Copy, Loader2, PartyPopper, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cancelLottery, createLottery, getLotteryWin, stopLottery } from "@/lib/api/client";
import type { LotteryCreatePayload, LotteryPrizePayload } from "@/lib/api/lottery";
import type { LotteryWinResponse } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

interface PrizeFormItem {
  name: string;
  description: string;
  number: string;
}

const emptyPrize: PrizeFormItem = { name: "", description: "", number: "1" };

export function LotteryPanel() {
  const { token } = useUserConsole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [number, setNumber] = useState("0");
  const [ruleCarrot, setRuleCarrot] = useState("0");
  const [ruleSign, setRuleSign] = useState("0");
  const [prizes, setPrizes] = useState<PrizeFormItem[]>([{ ...emptyPrize }]);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createdId, setCreatedId] = useState("");

  const [queryId, setQueryId] = useState("");
  const [winResult, setWinResult] = useState<LotteryWinResponse | null>(null);
  const [queryStatus, setQueryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [queryMessage, setQueryMessage] = useState("");
  const [actionId, setActionId] = useState("");

  function updatePrize(index: number, patch: Partial<PrizeFormItem>) {
    setPrizes((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addPrize() {
    if (prizes.length >= 20) {
      return;
    }

    setPrizes((current) => [...current, { ...emptyPrize }]);
  }

  function removePrize(index: number) {
    setPrizes((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  function toApiTime(value: string) {
    return value ? value.replace("T", " ") + (value.length === 16 ? ":00" : "") : "";
  }

  async function handleCreate() {
    if (!name.trim()) {
      setCreateMessage("请填写抽奖名称");
      return;
    }

    if (!timeStart || !timeEnd) {
      setCreateMessage("请选择开始与结束时间");
      return;
    }

    const amountValue = Number(amount);

    if (!Number.isInteger(amountValue) || amountValue < 1 || amountValue > 50000) {
      setCreateMessage("参加所需萝卜需为 1-50000 之间的整数");
      return;
    }

    const preparedPrizes: LotteryPrizePayload[] = [];

    for (const prize of prizes) {
      if (!prize.name.trim()) {
        setCreateMessage("奖品名称不能为空");
        return;
      }

      const prizeNumber = Number(prize.number);

      if (!Number.isInteger(prizeNumber) || prizeNumber < 1 || prizeNumber > 100) {
        setCreateMessage("奖品数量需为 1-100 之间的整数");
        return;
      }

      preparedPrizes.push({
        name: prize.name.trim(),
        description: prize.description.trim() || null,
        number: prizeNumber,
      });
    }

    const payload: LotteryCreatePayload = {
      name: name.trim(),
      description: description.trim(),
      time_start: toApiTime(timeStart),
      time_end: toApiTime(timeEnd),
      amount: amountValue,
      number: Number(number) || 0,
      rule_carrot: Number(ruleCarrot) || 0,
      rule_sign: Number(ruleSign) || 0,
      prizes: preparedPrizes,
    };

    if (!window.confirm(`确认创建抽奖「${payload.name}」？`)) {
      return;
    }

    setCreating(true);
    setCreateMessage("");
    setCreatedId("");

    try {
      const result = await createLottery(payload, token);
      setCreatedId(result.lottery_id);
      setCreateMessage("抽奖创建成功");
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "抽奖创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleQuery() {
    const id = queryId.trim();

    if (!id) {
      setQueryMessage("请输入抽奖 ID");
      return;
    }

    setQueryStatus("loading");
    setQueryMessage("");

    try {
      const result = await getLotteryWin(id, token);
      setWinResult(result);
      setQueryStatus("ready");
    } catch (error) {
      setWinResult(null);
      setQueryStatus("error");
      setQueryMessage(error instanceof Error ? error.message : "查询失败");
    }
  }

  async function handleCancel() {
    const id = queryId.trim();

    if (!id || !window.confirm("确认取消该抽奖？取消后参与萝卜将退回。")) {
      return;
    }

    setActionId("cancel");

    try {
      const result = await cancelLottery(id, token);
      setQueryMessage(result.is_success ? "抽奖已取消" : "取消未成功，可能已开奖或已结束");
    } catch (error) {
      setQueryMessage(error instanceof Error ? error.message : "取消失败");
    } finally {
      setActionId("");
    }
  }

  async function handleStop() {
    const id = queryId.trim();

    if (!id || !window.confirm("确认立即开奖？此操作不可撤销。")) {
      return;
    }

    setActionId("stop");

    try {
      await stopLottery(id, token);
      setQueryMessage("已触发开奖");
    } catch (error) {
      setQueryMessage(error instanceof Error ? error.message : "开奖失败");
    } finally {
      setActionId("");
    }
  }

  async function handleCopyId() {
    if (!createdId) {
      return;
    }

    await navigator.clipboard.writeText(createdId);
    setCreateMessage("抽奖 ID 已复制");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <PartyPopper className="h-4 w-4 text-muted-foreground" />
          创建抽奖
        </div>
        <p className="mt-2 text-sm text-muted-foreground">人数填 0 为时间开奖，结束时间需在一周内。</p>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-xs text-muted-foreground">抽奖名称（50 字内）</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">抽奖简介（200 字内）</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} rows={2} className="mt-2 w-full rounded-2xl border border-border/70 bg-background/50 px-4 py-2 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">开始时间</span>
              <input value={timeStart} onChange={(event) => setTimeStart(event.target.value)} type="datetime-local" className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">结束时间</span>
              <input value={timeEnd} onChange={(event) => setTimeEnd(event.target.value)} type="datetime-local" className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">参加萝卜（1-50000）</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={1} max={50000} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">总人数（0 为时间开奖）</span>
              <input value={number} onChange={(event) => setNumber(event.target.value)} type="number" min={0} max={5000} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">门槛萝卜（0 不限）</span>
              <input value={ruleCarrot} onChange={(event) => setRuleCarrot(event.target.value)} type="number" min={0} max={50000} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">门槛签到天数（0 不限）</span>
              <input value={ruleSign} onChange={(event) => setRuleSign(event.target.value)} type="number" min={0} max={5000} className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">奖品（1-20 个）</span>
              <button type="button" onClick={addPrize} disabled={prizes.length >= 20} className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" />
                添加奖品
              </button>
            </div>
            {prizes.map((prize, index) => (
              <div key={index} className="space-y-2 rounded-2xl border border-border/50 bg-muted/10 p-3">
                <div className="flex items-center gap-2">
                  <input value={prize.name} onChange={(event) => updatePrize(index, { name: event.target.value })} placeholder="奖品名称" maxLength={50} className="h-10 flex-1 rounded-xl border border-border/70 bg-background/50 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                  <input value={prize.number} onChange={(event) => updatePrize(index, { number: event.target.value })} type="number" min={1} max={100} className="h-10 w-20 rounded-xl border border-border/70 bg-background/50 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                  <button type="button" onClick={() => removePrize(index)} disabled={prizes.length <= 1} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/35 text-danger transition-colors hover:bg-danger/10 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input value={prize.description} onChange={(event) => updatePrize(index, { description: event.target.value })} placeholder="奖品简介（可选）" maxLength={200} className="h-10 w-full rounded-xl border border-border/70 bg-background/50 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              </div>
            ))}
          </div>

          <button type="button" onClick={handleCreate} disabled={creating} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PartyPopper className="h-4 w-4" />}
            {creating ? "创建中" : "创建抽奖"}
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
          中奖列表 / 管理
        </div>
        <p className="mt-2 text-sm text-muted-foreground">输入抽奖 ID 查看中奖名单，或取消、立即开奖。</p>

        <div className="mt-5 flex gap-2">
          <input value={queryId} onChange={(event) => setQueryId(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleQuery()} placeholder="抽奖 ID" className="h-11 flex-1 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          <button type="button" onClick={handleQuery} disabled={queryStatus === "loading"} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">查询</button>
        </div>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={handleCancel} disabled={actionId !== ""} className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">取消抽奖</button>
          <button type="button" onClick={handleStop} disabled={actionId !== ""} className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">立即开奖</button>
        </div>

        <div className="mt-4 space-y-2">
          {queryStatus === "loading" ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在查询</div> : null}
          {queryStatus === "error" ? <div className="py-6 text-sm text-danger">{queryMessage}</div> : null}
          {queryStatus === "ready" && winResult ? (
            <>
              <div className="rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                <div className="text-sm font-semibold">{winResult.lottery_name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{winResult.time_start} 至 {winResult.time_end} · 参加 {winResult.amount} 萝卜</div>
              </div>
              {winResult.users.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">暂无中奖记录</div> : null}
              {winResult.users.map((winner) => (
                <div key={`${winner.user_id}-${winner.join_index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{winner.user_username}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{winner.join_at}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-green-500">{winner.prize_name}</div>
                </div>
              ))}
            </>
          ) : null}
          {queryStatus !== "ready" && queryMessage ? <div className="text-sm text-muted-foreground">{queryMessage}</div> : null}
        </div>
      </GlassPanel>
    </div>
  );
}
