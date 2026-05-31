import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, PaginatedResponse } from "@/lib/api/types";

export interface InviteUserPayload {
  invite_user_id: string;
}

export interface RevokeInvitePayload {
  user_id: string;
}

export interface InviteMutationResponse {
  invite_remaining?: number;
  message?: string;
  [key: string]: unknown;
}

export interface InviteParent {
  user_id?: string;
  username?: string;
  pseudonym?: string | null;
  [key: string]: unknown;
}

export interface InviteInfoResponse {
  invite_at?: string;
  invite_remaining?: number;
  invite_count?: number;
  parent?: InviteParent | null;
  [key: string]: unknown;
}

export interface InviteHistoryItem {
  id?: string | number;
  invite_user_id?: string;
  user_id?: string;
  username?: string;
  telegram_user_id?: string | null;
  pseudonym?: string | null;
  invite_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface InviteHistoryParams extends QueryParams {
  page?: number;
  page_size?: number;
  username?: string;
  user_id?: string;
  telegram_user_id?: string;
}

export type InviteHistoryResponse = PaginatedResponse<InviteHistoryItem>;

export function inviteUser(data: InviteUserPayload, token?: string) {
  return requestJson<InviteMutationResponse>("/api/emos/api/invite", token, jsonRequestInit("POST", data));
}

export function inviteEmps(token?: string) {
  return requestJson<InviteMutationResponse>("/api/emos/api/invite/emps", token, jsonRequestInit("POST"));
}

export function revokeInvite(data: RevokeInvitePayload, token?: string) {
  return requestJson<InviteMutationResponse>("/api/emos/api/invite/revoke", token, jsonRequestInit("POST", data));
}

export function getInviteInfo(token?: string) {
  return requestJson<InviteInfoResponse>("/api/emos/api/invite/info", token);
}

export function getInviteHistory(params?: InviteHistoryParams, token?: string) {
  return requestJson<InviteHistoryResponse>(buildApiPath("/api/emos/api/invite/history", params), token);
}

export type InviteApiEntity = ApiEntity;
