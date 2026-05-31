import { buildApiPath, type QueryParams, requestJson } from "@/lib/api/request";
import type { LiveLibrary, LiveListResponse, LiveMediaResponse } from "@/lib/api/types";

export interface LiveListParams extends QueryParams {
  library_id?: number | string;
  code?: string;
  title?: string;
  page?: number;
  page_size?: number;
}

export interface LiveMediaParams extends QueryParams {
  live_list_id: number | string;
  page?: number;
  page_size?: number;
}

export function getLiveLibrary(token?: string) {
  return requestJson<LiveLibrary[]>("/api/emos/api/live/library", token);
}

export function getLiveList(params?: LiveListParams, token?: string) {
  return requestJson<LiveListResponse>(buildApiPath("/api/emos/api/live/list", params), token);
}

export function getLiveMedia(params: LiveMediaParams, token?: string) {
  return requestJson<LiveMediaResponse>(buildApiPath("/api/emos/api/live/media", params), token);
}
