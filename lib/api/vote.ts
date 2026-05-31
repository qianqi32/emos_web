import { jsonRequestInit, requestJson } from "@/lib/api/request";
import type { VoteCreateResponse, VoteResultResponse } from "@/lib/api/types";

export interface VoteCreatePayload {
  question: string;
  description: string;
  options: string[];
  seconds: number;
  allows_revoting: boolean;
  hide_results_until_closes: boolean;
}

export function createVote(data: VoteCreatePayload, token?: string) {
  return requestJson<VoteCreateResponse>("/api/emos/api/telegram/vote/create", token, jsonRequestInit("POST", data));
}

export function getVoteResult(voteId: string, token?: string) {
  return requestJson<VoteResultResponse>(`/api/emos/api/telegram/vote/result?vote_id=${encodeURIComponent(voteId)}`, token);
}
