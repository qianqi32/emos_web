import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, MutationResponse, PaginatedResponse } from "@/lib/api/types";

export interface WatchListParams extends QueryParams {
  name?: string;
  is_public?: boolean;
  is_self?: boolean;
  is_subscribe?: boolean;
}

export interface WatchSavePayload {
  id?: number;
  name: string;
  description: string;
  is_public: boolean;
  point: number;
  tags: string[];
  is_show_empty: boolean;
  image_poster?: string;
}

export interface WatchSortParams extends QueryParams {
  sort: number;
}

export interface WatchSubscribeParams extends QueryParams {
  sort?: number;
}

export interface WatchVideoListParams extends QueryParams {
  video_title?: string;
}

export interface WatchVideoSearchParams extends QueryParams {
  title: string;
  type?: string;
}

export interface WatchVideoUpdatePayload {
  sort: number;
  remark?: string;
}

export function getWatchList(params?: WatchListParams, token?: string) {
  return requestJson<PaginatedResponse>(buildApiPath("/api/emos/api/watch", params), token);
}

export function saveWatch(data: WatchSavePayload, token?: string) {
  return requestJson<MutationResponse>("/api/emos/api/watch", token, jsonRequestInit("POST", data));
}

export function deleteWatch(watchId: string, token?: string) {
  return requestJson<void>(`/api/emos/api/watch/${encodeURIComponent(watchId)}`, token, { method: "DELETE" });
}

export function sortWatch(watchId: string, params: WatchSortParams, token?: string) {
  return requestJson<void>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/sort`, params), token, { method: "PUT" });
}

export function toggleWatchSubscribe(watchId: string, params?: WatchSubscribeParams, token?: string) {
  return requestJson<MutationResponse>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/subscribe`, params), token, { method: "PUT" });
}

export function getWatchVideoList(watchId: string, params?: WatchVideoListParams, token?: string) {
  return requestJson<PaginatedResponse>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video`, params), token);
}

export function searchWatchVideo(watchId: string, params: WatchVideoSearchParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/search`, params), token);
}

export function updateWatchVideo(watchId: string, videoId: string, data: WatchVideoUpdatePayload, token?: string) {
  return requestJson<MutationResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/${encodeURIComponent(videoId)}`, token, jsonRequestInit("POST", data));
}

export function deleteWatchVideo(watchId: string, videoId: string, token?: string) {
  return requestJson<void>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/${encodeURIComponent(videoId)}`, token, { method: "DELETE" });
}
