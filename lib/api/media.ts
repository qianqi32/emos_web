import { buildApiPath, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, MutationResponse } from "@/lib/api/types";

export interface MediaListParams extends QueryParams {
  video_list_id?: string;
  video_season_id?: string;
  video_episode_id?: string;
  video_part_id?: string;
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

export function getMediaList(params?: MediaListParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/media/list", params), token);
}

export function deleteMedia(mediaId: string, token?: string) {
  return requestJson<MutationResponse>(buildApiPath("/api/emos/api/video/media/delete", { media_id: mediaId }), token, { method: "DELETE" });
}

export function moveMedia(params: MediaMoveParams, token?: string) {
  return requestJson<MutationResponse>(buildApiPath("/api/emos/api/video/media/move", params), token, { method: "PUT" });
}

export function renameMedia(params: MediaRenameParams, token?: string) {
  return requestJson<MutationResponse>(buildApiPath("/api/emos/api/video/media/rename", params), token, { method: "PUT" });
}
