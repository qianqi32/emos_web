import { buildApiPath, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity } from "@/lib/api/types";

export function getEmyaLoginPassword(token?: string) {
  return requestJson<ApiEntity>("/api/emos/api/emya/getLoginPassword", token);
}

export function resetEmyaPassword(password: string, token?: string) {
  return requestJson<void>(buildApiPath("/api/emos/api/emya/resetPassword", { password }), token, { method: "PUT" });
}

export type EmyaQueryParams = QueryParams;
