import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { DeviceSession, LogoutDeviceResponse, TemporaryPasswordResponse } from "@/lib/api/types";

export function getEmyaLoginPassword(token?: string) {
  return requestJson<TemporaryPasswordResponse>("/api/emos/api/emya/getLoginPassword", token);
}

export function resetEmyaPassword(password: string, token?: string) {
  return requestJson<void>(buildApiPath("/api/emos/api/emya/resetPassword", { password }), token, { method: "PUT" });
}

export interface EmyaLogoutPayload {
  device_id: string | null;
}

export function getEmyaHistory(token?: string) {
  return requestJson<DeviceSession[]>("/api/emos/api/emya/history", token);
}

export function logoutEmya(data: EmyaLogoutPayload, token?: string) {
  return requestJson<LogoutDeviceResponse>("/api/emos/api/emya/logout", token, jsonRequestInit("POST", data));
}

export type EmyaQueryParams = QueryParams;
