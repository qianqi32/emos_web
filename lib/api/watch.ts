import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { MutationResponse, PaginatedResponse, WatchDynamicResponse, WatchListResponse, WatchSaveResponse, WatchShowResponse, WatchSlotResponse, WatchSubscribeResponse, WatchVideoBatchResultItem, WatchVideoCountResponse, WatchVideoListResponse, WatchVideoSearchItem } from "@/lib/api/types";

export interface WatchListParams extends QueryParams {
  watch_id?: string;
  type?: string;
  name?: string;
  author_id?: string;
  author_username?: string;
  is_public?: boolean;
  is_self?: boolean;
  is_subscribe?: boolean;
}

export interface WatchSavePayload {
  id?: number | null;
  type: string;
  name: string;
  description: string;
  is_public: boolean;
  point: number;
  tags: string[];
  is_show_empty: boolean;
  image_poster_url?: string | null;
}

export interface WatchSortParams extends QueryParams {
  sort: number;
}

export interface WatchMaintainerPayload {
  maintainers: string[];
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
  remark?: string | null;
}

export interface WatchDynamicPayload {
  url: string | null;
}

export interface WatchVideoBatchItem {
  type: "tmdb_tv" | "tmdb_movie" | "todb" | "video_id" | string;
  value: string;
}

export function getWatchList(params?: WatchListParams, token?: string) {
  return requestJson<WatchListResponse>(buildApiPath("/api/emos/api/watch", params), token);
}

export function redeemWatchSlot(token?: string) {
  return requestJson<WatchSlotResponse>("/api/emos/api/watch/slot", token, jsonRequestInit("POST"));
}

export function saveWatch(data: WatchSavePayload, token?: string) {
  return requestJson<WatchSaveResponse>("/api/emos/api/watch", token, jsonRequestInit("POST", data));
}

export function updateWatchMaintainers(watchId: string, data: WatchMaintainerPayload, token?: string) {
  return requestJson<MutationResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/maintainer`, token, jsonRequestInit("PUT", data));
}

export function deleteWatch(watchId: string, token?: string) {
  return requestJson<void>(`/api/emos/api/watch/${encodeURIComponent(watchId)}`, token, { method: "DELETE" });
}

export function sortWatch(watchId: string, params: WatchSortParams, token?: string) {
  return requestJson<void>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/sort`, params), token, { method: "PUT" });
}

export function toggleWatchShow(watchId: string, token?: string) {
  return requestJson<WatchShowResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/show`, token, { method: "PUT" });
}

export function getWatchUsers(watchId: string, token?: string) {
  return requestJson<PaginatedResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/user`, token);
}

export function toggleWatchSubscribe(watchId: string, params?: WatchSubscribeParams, token?: string) {
  return requestJson<WatchSubscribeResponse>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/subscribe`, params), token, { method: "PUT" });
}

export function getWatchVideoList(watchId: string, params?: WatchVideoListParams, token?: string) {
  return requestJson<WatchVideoListResponse>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video`, params), token);
}

export function searchWatchVideo(watchId: string, params: WatchVideoSearchParams, token?: string) {
  return requestJson<WatchVideoSearchItem[]>(buildApiPath(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/search`, params), token);
}

export function updateWatchVideo(watchId: string, videoId: string, data: WatchVideoUpdatePayload, token?: string) {
  return requestJson<WatchVideoCountResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/${encodeURIComponent(videoId)}`, token, jsonRequestInit("POST", data));
}

export function deleteWatchVideo(watchId: string, videoId: string, token?: string) {
  return requestJson<WatchVideoCountResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/${encodeURIComponent(videoId)}`, token, { method: "DELETE" });
}

export function clearWatchVideos(watchId: string, token?: string) {
  return requestJson<WatchVideoCountResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/empty`, token, { method: "DELETE" });
}

export function updateWatchDynamic(watchId: string, data: WatchDynamicPayload, token?: string) {
  return requestJson<WatchDynamicResponse>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/dynamic`, token, jsonRequestInit("PUT", data));
}

export function batchUpdateWatchVideos(watchId: string, data: WatchVideoBatchItem[], token?: string) {
  return requestJson<WatchVideoBatchResultItem[]>(`/api/emos/api/watch/${encodeURIComponent(watchId)}/video/update`, token, jsonRequestInit("POST", data));
}
