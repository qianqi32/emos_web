import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, MutationResponse, RecordChangeResponse, RecordListResponse, RecordRequestResponse, VideoEpisodeItem, VideoIdentifyResponse, VideoListResponse, VideoSeasonItem } from "@/lib/api/types";

export interface VideoListParams extends QueryParams {
  tmdb_id?: string;
  todb_id?: string;
  video_id?: string;
  type?: string;
  title?: string;
  only_delete?: boolean;
  with_media?: boolean | number;
  page?: number;
  page_size?: number;
}

export interface VideoSearchParams extends QueryParams {
  last_id?: string;
  tmdb_id?: string;
  todb_id?: string;
  video_id?: string;
  type?: string;
  title?: string;
  with_genre?: boolean;
  sort_by?: string;
  page?: number;
  page_size?: number;
}

export interface VideoTreeParams extends QueryParams {
  type?: string;
  title?: string;
  tmdb_id?: string;
  todb_id?: string;
  video_id?: string;
}

export interface VideoIdParams extends QueryParams {
  video_id_type: string;
  video_id_value: string;
  season_number?: string;
  episode_number?: string;
}

export interface VideoSyncParams extends QueryParams {
  tmdb_id?: string;
  todb_id?: string;
}

export interface VideoEpisodeParams extends QueryParams {
  season_number?: string;
  with_seek?: boolean;
  with_seek_is_request?: boolean;
}

export interface VideoPersonsParams extends QueryParams {
  title?: string;
}

export function syncVideo(params?: VideoSyncParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/sync", params), token, jsonRequestInit("PATCH"));
}

export function getVideoTree(params?: VideoTreeParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/tree", params), token);
}

export interface VideoIdentifyPayload {
  filename: string;
}

export function identifyVideo(data: VideoIdentifyPayload, token?: string) {
  return requestJson<VideoIdentifyResponse>("/api/emos/api/video/identify", token, jsonRequestInit("POST", data));
}

export function getVideoId(params: VideoIdParams, token?: string) {
  return requestJson<ApiEntity>(buildApiPath("/api/emos/api/video/getVideoId", params), token);
}

export function getVideoList(params?: VideoListParams, token?: string) {
  return requestJson<VideoListResponse>(buildApiPath("/api/emos/api/video/list", params), token);
}

export function searchVideo(params?: VideoSearchParams, token?: string) {
  return requestJson<VideoListResponse>(buildApiPath("/api/emos/api/video/search", params), token);
}

export function toggleVideoDelete(videoId: string, token?: string) {
  return requestJson<MutationResponse>(`/api/emos/api/video/${encodeURIComponent(videoId)}/delete`, token, { method: "PUT" });
}

export function getVideoSeasons(videoId: string, token?: string) {
  return requestJson<VideoSeasonItem[]>(`/api/emos/api/video/${encodeURIComponent(videoId)}/season`, token);
}

export function getVideoEpisodes(videoId: string, params?: VideoEpisodeParams, token?: string) {
  return requestJson<VideoEpisodeItem[]>(buildApiPath(`/api/emos/api/video/${encodeURIComponent(videoId)}/episode`, params), token);
}

export function getVideoPersons(params?: VideoPersonsParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/persons", params), token);
}

export interface RecordRequestParams extends QueryParams {
  user_id?: string;
  page?: number;
  page_size?: number;
}

export interface RecordListParams extends QueryParams {
  type?: string;
  page?: number;
  page_size?: number;
}

export interface RecordChangeParams extends QueryParams {
  mode: "delete" | "complete" | string;
  type: string;
  id: string;
}

export function getRecordRequest(params?: RecordRequestParams, token?: string) {
  return requestJson<RecordRequestResponse>(buildApiPath("/api/emos/api/video/record/request", params), token);
}

export function getRecordList(params?: RecordListParams, token?: string) {
  return requestJson<RecordListResponse>(buildApiPath("/api/emos/api/video/record/list", params), token);
}

export function changeRecord(params: RecordChangeParams, token?: string) {
  return requestJson<RecordChangeResponse>(buildApiPath("/api/emos/api/video/record/change", params), token, jsonRequestInit("PUT"));
}
