import { jsonRequestInit, requestJson } from "@/lib/api/request";
import type { LotteryCancelResponse, LotteryCreateResponse, LotteryWinResponse } from "@/lib/api/types";

export interface LotteryPrizePayload {
  name: string;
  description: string | null;
  number: number;
  bodys?: string[];
}

export interface LotteryCreatePayload {
  name: string;
  description: string;
  time_start: string;
  time_end: string;
  amount: number;
  number: number;
  rule_carrot: number;
  rule_sign: number;
  prizes: LotteryPrizePayload[];
}

export function createLottery(data: LotteryCreatePayload, token?: string) {
  return requestJson<LotteryCreateResponse>("/api/emos/api/lottery/create", token, jsonRequestInit("POST", data));
}

export function getLotteryWin(lotteryId: string, token?: string) {
  return requestJson<LotteryWinResponse>(`/api/emos/api/lottery/win?lottery_id=${encodeURIComponent(lotteryId)}`, token);
}

export function cancelLottery(lotteryId: string, token?: string) {
  return requestJson<LotteryCancelResponse>(`/api/emos/api/lottery/cancel?lottery_id=${encodeURIComponent(lotteryId)}`, token, { method: "PUT" });
}

export function stopLottery(lotteryId: string, token?: string) {
  return requestJson<Record<string, never>>(`/api/emos/api/lottery/stop?lottery_id=${encodeURIComponent(lotteryId)}`, token, { method: "PUT" });
}
