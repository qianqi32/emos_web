import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { ProxyLineCreateResponse, ProxyLineItem } from "@/lib/api/types";

export interface ProxyLineListParams extends QueryParams {
  is_self?: boolean;
}

export interface ProxyLinePayload {
  name: string;
  url: string;
  tagline: string;
}

export interface ProxyLineDeleteParams extends QueryParams {
  id: string;
}

export function getProxyLineList(params?: ProxyLineListParams, token?: string) {
  return requestJson<ProxyLineItem[]>(buildApiPath("/api/emos/api/proxy/line", params), token);
}

export function addProxyLine(data: ProxyLinePayload, token?: string) {
  return requestJson<ProxyLineCreateResponse>("/api/emos/api/proxy/line", token, jsonRequestInit("POST", data));
}

export function deleteProxyLine(params: ProxyLineDeleteParams, token?: string) {
  return requestJson<void>(buildApiPath("/api/emos/api/proxy/line", params), token, { method: "DELETE" });
}
