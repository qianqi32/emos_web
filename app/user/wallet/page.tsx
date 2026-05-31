"use client";

import { ExternalLink, Loader2, ReceiptText, RefreshCw, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { closePayOrder, createPayOrder, queryPayOrder } from "@/lib/api/client";
import type { PayCreateResponse, PayQueryResponse } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

function payStatusLabel(status: string) {
  if (status === "default") return "待支付";
  if (status === "paid") return "已支付";
  if (status === "close" || status === "closed") return "已关闭";
  return status;
}

function formatTime(value: string | null) {
  return value || "-";
}

export default function WalletPage() {
  const { token, user } = useUserConsole();
  const [price, setPrice] = useState("10");
  const [name, setName] = useState("EMOS 萝卜充值");
  const [createdOrder, setCreatedOrder] = useState<PayCreateResponse | null>(null);
  const [queryNo, setQueryNo] = useState("");
  const [queryResult, setQueryResult] = useState<PayQueryResponse | null>(null);
  const [action, setAction] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleCreateOrder() {
    const amount = Number.parseInt(price, 10);
    const orderName = name.trim();

    if (!Number.isInteger(amount) || amount < 1 || amount > 50000) {
      setMessage("充值数量必须在 1-50000 之间");
      return;
    }

    if (!orderName || orderName.length > 100) {
      setMessage("订单名称不能为空且不能超过 100 字");
      return;
    }

    if (!window.confirm(`确认创建 ${amount} 萝卜的网页版支付订单？`)) {
      return;
    }

    setAction("create");
    setMessage("");

    try {
      const result = await createPayOrder(
        {
          pay_way: "web",
          price: amount,
          name: orderName,
          param: null,
          callback_telegram_bot_name: null,
        },
        token
      );
      setCreatedOrder(result);
      setQueryNo(result.no);
      setMessage("支付订单已创建，可打开支付页面完成付款");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建支付订单失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleQueryOrder(no = queryNo) {
    const orderNo = no.trim();

    if (!orderNo) {
      setMessage("请输入订单号");
      return;
    }

    setAction("query");
    setMessage("");

    try {
      const result = await queryPayOrder({ no: orderNo }, token);
      setQueryResult(result);
    } catch (error) {
      setQueryResult(null);
      setMessage(error instanceof Error ? error.message : "查询支付订单失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleCloseOrder(no: string) {
    if (!window.confirm(`确认关闭支付订单 ${no}？只有未支付订单可关闭。`)) {
      return;
    }

    setAction("close");
    setMessage("");

    try {
      const result = await closePayOrder(no, token);
      setMessage(result.is_close ? "订单已关闭" : "订单未被关闭，可能已支付或已关闭");
      await handleQueryOrder(no);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "关闭支付订单失败");
    } finally {
      setAction("idle");
    }
  }

  function openPayUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <WalletCards className="h-3.5 w-3.5" />
          Wallet
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">萝卜充值</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              创建网页版支付订单并跳转官方支付页。支付成功后可通过订单号查询状态，萝卜余额以用户信息刷新后的结果为准。
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            当前萝卜 <span className="font-mono text-foreground">{user.carrot}</span>
          </div>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="px-4 py-3 text-sm text-muted-foreground">{message}</GlassPanel> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletCards className="h-4 w-4 text-muted-foreground" />
            创建充值订单
          </div>
          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-xs text-muted-foreground">充值数量</span>
              <input
                type="number"
                min="1"
                max="50000"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs text-muted-foreground">订单名称</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 100))}
                className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleCreateOrder()}
              disabled={action === "create"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {action === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              创建订单
            </button>
          </div>

          {createdOrder ? (
            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/10 p-4">
              <div className="text-sm font-semibold">订单已创建</div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div>订单号：<span className="font-mono text-foreground">{createdOrder.no}</span></div>
                <div>过期时间：<span className="font-mono text-foreground">{createdOrder.expired}</span></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openPayUrl(createdOrder.pay_url)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90"
                >
                  <ExternalLink className="h-4 w-4" />
                  打开支付页
                </button>
                <button
                  type="button"
                  onClick={() => void handleQueryOrder(createdOrder.no)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40"
                >
                  <RefreshCw className="h-4 w-4" />
                  查询状态
                </button>
              </div>
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
            查询支付订单
          </div>
          <div className="mt-5 space-y-4">
            <label>
              <span className="mb-2 block text-xs text-muted-foreground">订单号</span>
              <input
                value={queryNo}
                onChange={(event) => setQueryNo(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void handleQueryOrder()}
                placeholder="20260215153614-pay-eA2rq"
                className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleQueryOrder()}
              disabled={action === "query"}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
            >
              {action === "query" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              查询订单
            </button>
          </div>

          {queryResult ? (
            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{queryResult.order_name}</div>
                <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                  {payStatusLabel(queryResult.pay_status)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <span>订单号</span>
                  <span className="truncate font-mono text-foreground">{queryResult.no}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>订单金额</span>
                  <span className="font-mono text-foreground">{queryResult.price_order}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>结算金额</span>
                  <span className="font-mono text-foreground">{queryResult.price_settle}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>支付时间</span>
                  <span className="font-mono text-foreground">{formatTime(queryResult.time_payed)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>通知状态</span>
                  <span className="font-mono text-foreground">{queryResult.notify_status}</span>
                </div>
              </div>
              {queryResult.pay_status === "default" ? (
                <button
                  type="button"
                  onClick={() => void handleCloseOrder(queryResult.no)}
                  disabled={action === "close"}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
                >
                  {action === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  关闭订单
                </button>
              ) : null}
            </div>
          ) : null}
        </GlassPanel>
      </div>
    </div>
  );
}
