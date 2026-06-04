import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { CarrotMutationResponse, MediaPlayUrlResponse, PaginatedResponse, VideoMediaItem } from "@/lib/api/types";

export interface MediaListParams extends QueryParams {
  video_list_id?: string;
  video_season_id?: string;
  video_episode_id?: string;
  video_part_id?: string;
  include_metadata?: 1;
}

export interface MediaListAllParams extends QueryParams {
  media_id?: string;
  user_id?: string;
  status?: string;
  only_delete?: boolean;
  include_metadata?: boolean;
  page?: number;
  page_size?: number;
}

export interface MediaDeletePayload {
  media_id: string;
  reason?: string | null;
}

export interface MediaMoveParams extends QueryParams {
  media_id: string;
  item_type: string;
  item_id: string;
}

export interface MediaRenameParams extends QueryParams {
  media_id: string;
  name: string;
}

export interface MediaPlayUrlParams extends QueryParams {
  media_id: string;
}

export function getMediaList(params?: MediaListParams, token?: string) {
  return requestJson<VideoMediaItem[]>(buildApiPath("/api/emos/api/video/media/list", params), token);
}

export function getMediaListAll(params?: MediaListAllParams, token?: string) {
  return requestJson<PaginatedResponse<VideoMediaItem>>(buildApiPath("/api/emos/api/video/media/listAll", params), token);
}

export function deleteMedia(data: MediaDeletePayload, token?: string) {
  return requestJson<CarrotMutationResponse>("/api/emos/api/video/media/delete", token, jsonRequestInit("DELETE", data));
}

export function moveMedia(params: MediaMoveParams, token?: string) {
  return requestJson<CarrotMutationResponse>(buildApiPath("/api/emos/api/video/media/move", params), token, { method: "PUT" });
}

export function renameMedia(params: MediaRenameParams, token?: string) {
  return requestJson<CarrotMutationResponse>(buildApiPath("/api/emos/api/video/media/rename", params), token, { method: "PUT" });
}

export function getMediaPlayUrl(params: MediaPlayUrlParams, token?: string) {
  return requestJson<MediaPlayUrlResponse>(buildApiPath("/api/emos/api/video/media/playUrl", params), token);
}
