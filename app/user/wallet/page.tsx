"use client";

import { ArrowDownLeft, ArrowUpRight, ExternalLink, Link2, Loader2, ReceiptText, RefreshCw, Send, ShieldCheck, Store, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import {
  applyPayProvider,
  closePayOrder,
  createPayOrder,
  getPayProviderBase,
  getPayUserCarrot,
  getPayUserInfo,
  queryPayOrder,
  testPayNotify,
  transferPayCarrot,
  updatePayProvider
} from "@/lib/api/client";
import type { PayCreateResponse, PayProviderBase, PayQueryResponse, PayUserInfoResponse } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

type PendingWalletAction =
  | { type: "create"; amount: number; orderName: string; payWay: string; callbackParam: string | null }
  | { type: "close"; no: string }
  | { type: "test-notify"; no: string }
  | { type: "apply-provider"; name: string; description: string }
  | { type: "update-provider"; name: string; description: string; notifyUrl: string | null }
  | { type: "transfer"; userId: string; carrot: number }
  | null;

type ProviderFormState = {
  name: string;
  description: string;
  notifyUrl: string;
};

type ProviderFormValidation =
  | { error: string }
  | { name: string; description: string; notifyUrl: string | null };

type TransferFormState = {
  userId: string;
  carrot: string;
};

const emptyProviderForm: ProviderFormState = { name: "", description: "", notifyUrl: "" };
const emptyTransferForm: TransferFormState = { userId: "", carrot: "" };
const inputClass = "h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15";

function payStatusLabel(status: string) {
  if (status === "default") return "待支付";
  if (status === "paid" || status === "payed") return "已支付";
  if (status === "close" || status === "closed") return "已关闭";
  return status;
}

function providerStatusLabel(status: string | null | undefined) {
  if (status === "default") return "默认";
  if (status === "examine") return "审核中";
  if (status === "pass") return "已通过";
  if (status === "disable") return "已禁用";
  return status || "未申请";
}

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").slice(0, 16);
  }
  const bj = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = bj.getUTCFullYear();
  const m = String(bj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bj.getUTCDate()).padStart(2, "0");
  const h = String(bj.getUTCHours()).padStart(2, "0");
  const min = String(bj.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function validateProviderForm(form: ProviderFormState): ProviderFormValidation {
  const name = form.name.trim();
  const description = form.description.trim();
  const notifyUrl = form.notifyUrl.trim();

  if (!name || name.length > 10) {
    return { error: "服务商名称需为 1-10 字" };
  }

  if (!description || description.length > 200) {
    return { error: "服务商简介需为 1-200 字" };
  }

  if (notifyUrl && notifyUrl.length > 300) {
    return { error: "回调地址不能超过 300 字" };
  }

  return { name, description, notifyUrl: notifyUrl || null };
}

function OverviewItem({ icon: Icon, label, value }: { icon: typeof WalletCards; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/35 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="mt-3 truncate font-mono text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function WalletPage() {
  const { token, user } = useUserConsole();
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [payWay, setPayWay] = useState<"web" | "telegram_bot">("web");
  const [callbackParam, setCallbackParam] = useState("");
  const [createdOrder, setCreatedOrder] = useState<PayCreateResponse | null>(null);
  const [queryNo, setQueryNo] = useState("");
  const [queryResult, setQueryResult] = useState<PayQueryResponse | null>(null);
  const [provider, setProvider] = useState<PayProviderBase | null>(null);
  const [providerStatus, setProviderStatus] = useState<"loading" | "ready" | "error">("loading");
  const [providerForm, setProviderForm] = useState<ProviderFormState>(emptyProviderForm);
  const [transferForm, setTransferForm] = useState<TransferFormState>(emptyTransferForm);
  const [transferUser, setTransferUser] = useState<PayUserInfoResponse | null>(null);
  const [transferUserCarrot, setTransferUserCarrot] = useState<number | null>(null);
  const [transferCheckStatus, setTransferCheckStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingWalletAction>(null);
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");

  const isProviderPassed = provider?.status === "pass";
  const providerName = provider?.name || providerForm.name || "支付服务商";
  const notifyUrl = provider?.notify_url || providerForm.notifyUrl || "--";

  const loadProvider = useCallback(async (markLoading = true) => {
    if (markLoading) {
      setProviderStatus("loading");
    }

    try {
      const result = await getPayProviderBase(token);
      setProvider(result);
      setProviderForm({
        name: result.name || "",
        description: result.description || "",
        notifyUrl: result.notify_url || ""
      });
      setProviderStatus("ready");
    } catch {
      setProvider(null);
      setProviderForm(emptyProviderForm);
      setProviderStatus("ready");
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;

    getPayProviderBase(token)
      .then((result) => {
        if (ignore) return;
        setProvider(result);
        setProviderForm({
          name: result.name || "",
          description: result.description || "",
          notifyUrl: result.notify_url || ""
        });
        setProviderStatus("ready");
      })
      .catch(() => {
        if (ignore) return;
        setProvider(null);
        setProviderForm(emptyProviderForm);
        setProviderStatus("ready");
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleCreateOrder() {
    const amount = Number.parseInt(price, 10);
    const orderName = name.trim();
    const param = callbackParam.trim();

    if (!Number.isInteger(amount) || amount < 1 || amount > 50000) {
      setMessage("支付数量必须在 1-50000 之间");
      return;
    }

    if (!orderName || orderName.length > 100) {
      setMessage("订单名称不能为空且不能超过 100 字");
      return;
    }

    if (param.length > 40) {
      setMessage("回调参数不能超过 40 字");
      return;
    }

    setPendingAction({ type: "create", amount, orderName, payWay, callbackParam: param || null });
    setDialogError("");
  }

  async function submitCreateOrder(amount: number, orderName: string, payWayValue: string, callbackParamValue: string | null) {
    setAction("create");
    setMessage("");

    try {
      const result = await createPayOrder(
        {
          pay_way: payWayValue,
          price: amount,
          name: orderName,
          param: callbackParamValue,
          callback_telegram_bot_name: null,
        },
        token
      );
      setCreatedOrder(result);
      setQueryNo(result.no);
      setPendingAction(null);
      setMessage("支付订单已创建，可打开支付页面完成付款");
      await handleQueryOrder(result.no);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "创建支付订单失败");
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
    setPendingAction({ type: "close", no });
    setDialogError("");
  }

  async function submitCloseOrder(no: string) {
    setAction("close");
    setMessage("");

    try {
      const result = await closePayOrder(no, token);
      setMessage(result.is_close ? "订单已关闭" : "订单未被关闭，可能已支付或已关闭");
      setPendingAction(null);
      await handleQueryOrder(no);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "关闭支付订单失败");
    } finally {
      setAction("idle");
    }
  }

  function handleTestNotify(no: string) {
    if (!isProviderPassed) {
      setMessage("服务商审核通过后才能测试回调");
      return;
    }

    setPendingAction({ type: "test-notify", no });
    setDialogError("");
  }

  async function submitTestNotify(no: string) {
    setAction("test-notify");
    setMessage("");

    try {
      const result = await testPayNotify({ no }, token);
      setPendingAction(null);
      setMessage(`测试回调已触发，通知次数 ${result.notify_number}，结算 ${result.price_settle} 萝卜`);
      await handleQueryOrder(no);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "测试回调失败");
    } finally {
      setAction("idle");
    }
  }

  function handleProviderSubmit() {
    const validated = validateProviderForm(providerForm);

    if ("error" in validated) {
      setMessage(validated.error);
      return;
    }

    if (provider?.status && !isProviderPassed) {
      setMessage("服务商审核通过后才能更新资料");
      return;
    }

    setDialogError("");

    if (provider?.status) {
      setPendingAction({ type: "update-provider", name: validated.name, description: validated.description, notifyUrl: validated.notifyUrl });
    } else {
      setPendingAction({ type: "apply-provider", name: validated.name, description: validated.description });
    }
  }

  async function submitProvider(actionValue: Exclude<PendingWalletAction, null>) {
    if (actionValue.type !== "apply-provider" && actionValue.type !== "update-provider") {
      return;
    }

    setAction(actionValue.type);
    setMessage("");

    try {
      if (actionValue.type === "apply-provider") {
        await applyPayProvider({ name: actionValue.name, description: actionValue.description }, token);
        setMessage("服务商申请已提交，请等待审核");
      } else {
        await updatePayProvider({ name: actionValue.name, description: actionValue.description, notify_url: actionValue.notifyUrl }, token);
        setMessage("服务商信息已更新");
      }

      setPendingAction(null);
      await loadProvider();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "服务商信息提交失败");
    } finally {
      setAction("idle");
    }
  }

  function handleTransferSubmit() {
    const targetUserId = transferForm.userId.trim();
    const carrot = Number.parseInt(transferForm.carrot, 10);

    if (!targetUserId) {
      setMessage("请输入收款用户 ID");
      return;
    }

    if (!Number.isInteger(carrot) || carrot < 1 || carrot > 50000) {
      setMessage("转账数量必须在 1-50000 之间");
      return;
    }

    setPendingAction({ type: "transfer", userId: targetUserId, carrot });
    setDialogError("");
  }

  async function handleCheckTransferUser() {
    const targetUserId = transferForm.userId.trim();

    if (!targetUserId) {
      setMessage("请输入收款用户 ID");
      return;
    }

    setTransferCheckStatus("loading");
    setTransferUser(null);
    setTransferUserCarrot(null);
    setMessage("");

    try {
      const [userInfo, carrotInfo] = await Promise.all([
        getPayUserInfo({ user_id: targetUserId }, token),
        getPayUserCarrot({ user_id: targetUserId }, token)
      ]);
      setTransferUser(userInfo);
      setTransferUserCarrot(carrotInfo.carrot);
      setTransferCheckStatus("ready");
    } catch (error) {
      setTransferCheckStatus("error");
      setMessage(error instanceof Error ? error.message : "收款用户核验失败");
    }
  }

  async function submitTransfer(userId: string, carrot: number) {
    setAction("transfer");
    setMessage("");

    try {
      const result = await transferPayCarrot({ user_id: userId, carrot }, token);
      setPendingAction(null);
      setTransferForm(emptyTransferForm);
      setTransferUser(null);
      setTransferUserCarrot(null);
      setTransferCheckStatus("idle");
      setMessage(`转账成功，实际扣除 ${result.deduct ?? carrot} 萝卜，当前剩余 ${result.carrot ?? "-"} 萝卜`);
      await loadProvider();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "转账失败");
    } finally {
      setAction("idle");
    }
  }

  function openPayUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function pendingDescription() {
    if (pendingAction?.type === "create") {
      return `将创建 ${pendingAction.amount} 萝卜的${pendingAction.payWay === "web" ? "网页版" : "Telegram Bot"}支付订单「${pendingAction.orderName}」。`;
    }

    if (pendingAction?.type === "close") {
      return `将关闭支付订单 ${pendingAction.no}，只有未支付订单可关闭。`;
    }

    if (pendingAction?.type === "test-notify") {
      return `将对支付订单 ${pendingAction.no} 触发一次测试回调，用于验证服务商通知地址是否可用。`;
    }

    if (pendingAction?.type === "apply-provider") {
      return `将申请成为支付服务商「${pendingAction.name}」，提交申请会扣除 5000 萝卜，请确认余额充足。`;
    }

    if (pendingAction?.type === "update-provider") {
      return `将更新支付服务商「${pendingAction.name}」的信息。建议配置可公网访问的 Web 回调地址，避免只靠机器人通知导致丢单。`;
    }

    if (pendingAction?.type === "transfer") {
      return `将向用户 ${pendingAction.userId} 转账 ${pendingAction.carrot} 萝卜。若用于提现，手续费不得高于 10‰。`;
    }

    return undefined;
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={message} onClose={() => setMessage("")} />
      <GlassPanel className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/20 text-foreground shadow-sm">
                <WalletCards className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">支付管理</h1>
                  <span className="rounded-full border border-border/60 bg-background/45 px-2.5 py-1 text-xs text-muted-foreground">
                    {providerStatus === "loading" ? "同步中" : providerStatusLabel(provider?.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{providerName}</p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              统一管理网页版支付订单、服务商资料和用户转账。申请成为支付服务商会扣除 5000 萝卜；用户提现时手续费不得高于 10‰。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadProvider()}
            disabled={providerStatus === "loading"}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            {providerStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            刷新
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewItem icon={WalletCards} label="当前萝卜" value={user.carrot} />
          <OverviewItem icon={ArrowDownLeft} label="服务商收入" value={provider?.total_revenue ?? 0} />
          <OverviewItem icon={ArrowUpRight} label="服务商支出" value={provider?.total_expenditure ?? 0} />
          <OverviewItem icon={Link2} label="通知 URL" value={notifyUrl} />
        </div>
      </GlassPanel>


      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Store className="h-4 w-4 text-muted-foreground" />
                服务商资料
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">填写机构名称和简介。审核通过后建议配置可公网访问的 Web 回调地址。</p>
            </div>
            <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">{providerStatusLabel(provider?.status)}</span>
          </div>

          <div className="mt-5 grid gap-3">
            <input
              value={providerForm.name}
              onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={10}
              placeholder="服务商名称，10 字内"
              className={inputClass}
            />
            <textarea
              value={providerForm.description}
              onChange={(event) => setProviderForm((current) => ({ ...current, description: event.target.value }))}
              maxLength={200}
              placeholder="服务商简介，200 字内"
              rows={4}
              className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
            />
            {provider?.status ? (
              <input
                value={providerForm.notifyUrl}
                onChange={(event) => setProviderForm((current) => ({ ...current, notifyUrl: event.target.value }))}
                placeholder="Web 回调地址，可为空"
                className={inputClass}
              />
            ) : null}
            {!isProviderPassed ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-600 dark:text-amber-300">
                申请时将扣除 5000 萝卜；申请后请联系管理员审核。
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleProviderSubmit}
              disabled={action === "apply-provider" || action === "update-provider"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {action === "apply-provider" || action === "update-provider" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {provider?.status ? "更新资料" : "申请服务商"}
            </button>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Send className="h-4 w-4 text-muted-foreground" />
            用户转账
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">审核通过的服务商可向用户转账。如果用于提现，手续费不得高于 10‰。</p>

          {isProviderPassed ? (
            <div className="mt-5 grid gap-3">
              <input
                value={transferForm.userId}
                onChange={(event) => {
                  setTransferForm((current) => ({ ...current, userId: event.target.value }));
                  setTransferUser(null);
                  setTransferUserCarrot(null);
                  setTransferCheckStatus("idle");
                }}
                placeholder="收款用户 ID"
                className={inputClass}
              />
              <input
                type="number"
                min="1"
                max="50000"
                value={transferForm.carrot}
                onChange={(event) => setTransferForm((current) => ({ ...current, carrot: event.target.value }))}
                placeholder="转账萝卜"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCheckTransferUser()}
                  disabled={transferCheckStatus === "loading"}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
                >
                  {transferCheckStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  核验用户
                </button>
              </div>
              {transferUser ? (
                <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 text-xs leading-6 text-muted-foreground">
                  <div>用户：<span className="font-medium text-foreground">{transferUser.username}</span></div>
                  <div>ID：<span className="font-mono text-foreground">{transferUser.user_id}</span></div>
                  <div>可用萝卜：<span className="font-mono text-foreground">{transferUserCarrot ?? "-"}</span></div>
                  <div>状态：<span className="text-foreground">{transferUser.is_disable ? "已禁用" : "正常"}</span></div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleTransferSubmit}
                disabled={action === "transfer"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                {action === "transfer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                转账
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">
              当前状态暂不可转账。通过服务商审核后，这里会显示用户 ID 和萝卜转账表单。
            </div>
          )}
        </GlassPanel>
      </div>

      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
          订单管理
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-3xl border border-border/60 bg-background/30 p-4">
            <div className="text-sm font-semibold">创建支付订单</div>
            <div className="mt-4 grid gap-3">
              <select
                value={payWay}
                onChange={(event) => setPayWay(event.target.value as "web" | "telegram_bot")}
                className={inputClass}
              >
                <option value="web">网页支付</option>
                <option value="telegram_bot">Telegram Bot 支付</option>
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="价格"
                  className={inputClass}
                />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 100))}
                  placeholder="商品名称"
                  className={inputClass}
                />
              </div>
              <input
                value={callbackParam}
                onChange={(event) => setCallbackParam(event.target.value.slice(0, 40))}
                placeholder="回调参数（可选，40 字内）"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCreateOrder()}
              disabled={action === "create"}
              className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {action === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
              创建订单
            </button>

            {createdOrder ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-muted/10 p-4">
                <div className="flex flex-col gap-2 text-xs text-muted-foreground">
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
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/30 p-4">
            <div className="text-sm font-semibold">查询支付订单</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={queryNo}
                onChange={(event) => setQueryNo(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void handleQueryOrder()}
                placeholder="订单号"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => void handleQueryOrder()}
                disabled={action === "query"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                {action === "query" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                查询
              </button>
            </div>

            {queryResult ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-semibold">{queryResult.order_name}</div>
                  <span className="shrink-0 rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground">
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
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {queryResult.pay_status === "default" ? (
                    <button
                      type="button"
                      onClick={() => void handleCloseOrder(queryResult.no)}
                      disabled={action === "close"}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
                    >
                      {action === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      关闭订单
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleTestNotify(queryResult.no)}
                    disabled={action === "test-notify"}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
                  >
                    {action === "test-notify" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    测试回调
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </GlassPanel>

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "create"
            ? "确认创建支付订单"
            : pendingAction?.type === "close"
              ? "确认关闭支付订单"
              : pendingAction?.type === "test-notify"
                ? "确认测试支付回调"
                : pendingAction?.type === "transfer"
                  ? "确认服务商转账"
                  : pendingAction?.type === "apply-provider"
                    ? "确认申请支付服务商"
                    : "确认更新服务商信息"
        }
        description={pendingDescription()}
        confirmLabel={pendingAction?.type === "close" ? "关闭订单" : pendingAction?.type === "test-notify" ? "触发回调" : pendingAction?.type === "transfer" ? "确认转账" : pendingAction?.type === "apply-provider" ? "提交申请" : pendingAction?.type === "update-provider" ? "更新信息" : "创建订单"}
        confirmText={pendingAction?.type === "apply-provider" ? "确认申请" : pendingAction?.type === "transfer" ? "确认转账" : undefined}
        error={dialogError}
        loading={action !== "idle" && action !== "query"}
        tone={pendingAction?.type === "close" ? "danger" : "default"}
        onCancel={() => { setPendingAction(null); setDialogError(""); }}
        onConfirm={() => {
          if (pendingAction?.type === "create") {
            void submitCreateOrder(pendingAction.amount, pendingAction.orderName, pendingAction.payWay, pendingAction.callbackParam);
          } else if (pendingAction?.type === "close") {
            void submitCloseOrder(pendingAction.no);
          } else if (pendingAction?.type === "test-notify") {
            void submitTestNotify(pendingAction.no);
          } else if (pendingAction?.type === "apply-provider" || pendingAction?.type === "update-provider") {
            void submitProvider(pendingAction);
          } else if (pendingAction?.type === "transfer") {
            void submitTransfer(pendingAction.userId, pendingAction.carrot);
          }
        }}
      />
    </div>
  );
}
