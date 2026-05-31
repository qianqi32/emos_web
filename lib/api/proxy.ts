import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, MutationResponse } from "@/lib/api/types";

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
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/proxy/line", params), token);
}

export function addProxyLine(data: ProxyLinePayload, token?: string) {
  return requestJson<MutationResponse>("/api/emos/api/proxy/line", token, jsonRequestInit("POST", data));
}

export function deleteProxyLine(params: ProxyLineDeleteParams, token?: string) {
  return requestJson<void>(buildApiPath("/api/emos/api/proxy/line", params), token, { method: "DELETE" });
}
