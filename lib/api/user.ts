import { requestJson } from "@/lib/api/request";
import type { PseudonymResponse, ShowEmptyResponse, SignInResponse, TemporaryPasswordResponse, UserProfile } from "@/lib/api/types";

export function getUser(token?: string) {
  return requestJson<UserProfile>("/api/emos/api/user", token);
}

export function signIn(content: string, token?: string) {
  return requestJson<SignInResponse>(`/api/emos/api/user/sign?content=${encodeURIComponent(content)}`, token, { method: "PUT" });
}

export function getTemporaryPassword(token?: string) {
  return requestJson<TemporaryPasswordResponse>("/api/emos/api/user/passwordTemporary", token);
}

export function updatePseudonym(name: string, token?: string) {
  return requestJson<PseudonymResponse>(`/api/emos/api/user/pseudonym?name=${encodeURIComponent(name)}`, token, { method: "PUT" });
}

export function toggleShowEmpty(token?: string) {
  return requestJson<ShowEmptyResponse>("/api/emos/api/user/showEmpty", token, { method: "PUT" });
}

export function agreeUploadAgreement(token?: string) {
  return requestJson<void>("/api/emos/api/user/agreeUploadAgreement", token, { method: "PUT" });
}

export function resetPassword(password: string, token?: string) {
  return requestJson<void>(`/api/emos/api/user/passwordReset?password=${encodeURIComponent(password)}`, token, { method: "PUT" });
}
