import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { LiveLibrary, LiveListMutationResponse, LiveListResponse, LiveMediaCreateResponse, LiveMediaDeleteResponse, LiveMediaResponse, LiveMediaUpdateResponse } from "@/lib/api/types";

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

export interface LiveListSavePayload {
  id: number | null;
  live_library_id: number;
  title: string;
  description: string | null;
  tagline: string | null;
  image_poster: string | null;
}

export interface LiveMediaPayload {
  live_list_id: number | string;
  name: string;
  path_type: "m3u8";
  path_url: string;
}

export interface LiveMediaUpdatePayload {
  live_list_id: number | string;
  medias: Array<{
    name: string;
    path_type: "m3u8";
    path_url: string;
  }>;
}

export function getLiveLibrary(token?: string) {
  return requestJson<LiveLibrary[]>("/api/emos/api/live/library", token);
}

export function getLiveList(params?: LiveListParams, token?: string) {
  return requestJson<LiveListResponse>(buildApiPath("/api/emos/api/live/list", params), token);
}

export function saveLiveList(data: LiveListSavePayload, token?: string) {
  return requestJson<LiveListMutationResponse>("/api/emos/api/live/list", token, jsonRequestInit("POST", data));
}

export function deleteLiveList(liveListId: number | string, token?: string) {
  return requestJson<void>(`/api/emos/api/live/list/${encodeURIComponent(liveListId)}`, token, { method: "DELETE" });
}

export function getLiveMedia(params: LiveMediaParams, token?: string) {
  return requestJson<LiveMediaResponse>(buildApiPath("/api/emos/api/live/media", params), token);
}

export function addLiveMedia(data: LiveMediaPayload, token?: string) {
  return requestJson<LiveMediaCreateResponse>("/api/emos/api/live/media", token, jsonRequestInit("POST", data));
}

export function deleteLiveMedia(liveMediaId: string, token?: string) {
  return requestJson<LiveMediaDeleteResponse>(`/api/emos/api/live/media/${encodeURIComponent(liveMediaId)}`, token, { method: "DELETE" });
}

export function updateLiveMedia(data: LiveMediaUpdatePayload, token?: string) {
  return requestJson<LiveMediaUpdateResponse>("/api/emos/api/live/media/update", token, jsonRequestInit("POST", data));
}
