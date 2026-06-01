"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getUser, transferCarrot } from "@/lib/api/client";
import { useUserConsole } from "@/components/dashboard/user-console-context";

export function TransferPanel() {
  const { token, user, setUser } = useUserConsole();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{ userId: string; amount: number } | null>(null);
  const [message, setMessage] = useState("");

  async function handleTransfer() {
    const trimmedId = userId.trim();
    const parsedAmount = Number(amount);

    if (!trimmedId) {
      setMessage("请填写对方用户 ID");
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount < 2 || parsedAmount > 6000) {
      setMessage("萝卜数量必须是 2 到 6000 之间的整数");
      return;
    }

    setPendingTransfer({ userId: trimmedId, amount: parsedAmount });
  }

  async function submitTransfer(targetUserId: string, carrotAmount: number) {
    setLoading(true);
    setMessage("");

    try {
      const result = await transferCarrot({ user_id: targetUserId, carrot: carrotAmount }, token);
      setMessage(`转赠成功，剩余萝卜 ${result.carrot}`);
      setPendingTransfer(null);
      setUserId("");
      setAmount("");

      try {
        setUser(await getUser(token));
      } catch {
        setUser({ ...user, carrot: result.carrot });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "转赠失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">向其他用户转赠萝卜，单次 2-6000，操作前会二次确认。</p>

      <div className="grid gap-4">
        <label className="block">
          <span className="text-xs text-muted-foreground">对方用户 ID</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="例如 eWD3N7EX8s"
            className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">萝卜数量（2-6000）</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min={2}
            max={6000}
            placeholder="输入数量"
            className="mt-2 h-11 w-full rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <div className="text-sm text-muted-foreground">
          当前可用萝卜 <span className="font-mono text-foreground">{user.carrot}</span>
        </div>
        <button
          type="button"
          onClick={handleTransfer}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "转赠中" : "转赠萝卜"}
        </button>
      </div>

      {message ? <div className="rounded-2xl border border-border/50 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">{message}</div> : null}

      <ConfirmDialog
        open={pendingTransfer !== null}
        title="确认转赠萝卜"
        description={pendingTransfer ? `将向用户 ${pendingTransfer.userId} 转赠 ${pendingTransfer.amount} 萝卜，转赠后不可撤回。` : undefined}
        confirmLabel="确认转赠"
        confirmText="确认"
        loading={loading}
        tone="danger"
        onCancel={() => setPendingTransfer(null)}
        onConfirm={() => {
          if (pendingTransfer) {
            void submitTransfer(pendingTransfer.userId, pendingTransfer.amount);
          }
        }}
      />
    </div>
  );
}
