import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type {
  MutationResponse,
  PayCloseResponse,
  PayCreateResponse,
  PayProviderBase,
  PayQueryResponse,
  PayTransferResponse
} from "@/lib/api/types";

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

export interface PayProviderPayload {
  name: string;
  description: string;
  notify_url?: string | null;
}

export interface PayTransferPayload {
  user_id: string;
  carrot: number;
}

export function applyPayProvider(data: PayProviderPayload, token?: string) {
  return requestJson<MutationResponse>("/api/emos/api/pay/apply", token, jsonRequestInit("POST", data));
}

export function getPayProviderBase(token?: string) {
  return requestJson<PayProviderBase>("/api/emos/api/pay/base", token);
}

export function updatePayProvider(data: PayProviderPayload, token?: string) {
  return requestJson<PayProviderBase>("/api/emos/api/pay/update", token, jsonRequestInit("POST", data));
}

export function transferPayCarrot(data: PayTransferPayload, token?: string) {
  return requestJson<PayTransferResponse>("/api/emos/api/pay/transfer", token, jsonRequestInit("POST", data));
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
