import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { PayCloseResponse, PayCreateResponse, PayQueryResponse } from "@/lib/api/types";

export interface PayCreatePayload {
  pay_way: "web" | "telegram_bot" | string;
  price: number;
  name: string;
  param?: string | null;
  callback_telegram_bot_name?: string | null;
}

export interface PayQueryParams extends QueryParams {
  no: string;
}

export function createPayOrder(data: PayCreatePayload, token?: string) {
  return requestJson<PayCreateResponse>("/api/emos/api/pay/create", token, jsonRequestInit("POST", data));
}

export function queryPayOrder(params: PayQueryParams, token?: string) {
  return requestJson<PayQueryResponse>(buildApiPath("/api/emos/api/pay/query", params), token);
}

export function closePayOrder(no: string, token?: string) {
  return requestJson<PayCloseResponse>(buildApiPath("/api/emos/api/pay/close", { no }), token, { method: "PUT" });
}
