import { buildApiPath, type QueryParams, requestJson } from "@/lib/api/request";
import type { BanChangeResponse, BanListItem } from "@/lib/api/types";

export interface BanChangeParams extends QueryParams {
  type: "disable" | "unblock";
  user_id: string;
  reason: string;
}

export function getBanList(token?: string) {
  return requestJson<BanListItem[]>("/api/emos/api/ban/list", token);
}

export function changeBanStatus(params: BanChangeParams, token?: string) {
  return requestJson<BanChangeResponse>(buildApiPath("/api/emos/api/ban/change", params), token, { method: "PUT" });
}
