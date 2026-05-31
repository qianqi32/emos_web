export interface SignCheckResponse {
  is_sign: boolean;
  user_id: string | null;
}

export type ApiEntity = Record<string, unknown>;

export interface PaginatedResponse<T = ApiEntity> {
  list?: T[];
  items?: T[];
  data?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export interface MutationResponse {
  message?: string;
  [key: string]: unknown;
}

export interface UserSignInfo {
  sign_index?: number;
  earn_point?: number;
  continuous_days?: number;
  content?: string;
  created_at?: string;
}

export interface UserProfile {
  server_video: string | null;
  server_live: string | null;
  server_music: string | null;
  telegram_group_url: string | null;
  telegram_bind_url: string | null;
  telegram_user_id: string | null;
  user_id: string;
  username: string;
  avatar: string | null;
  pseudonym: string | null;
  password: string | null;
  is_show_empty: boolean;
  is_can_upload: boolean;
  is_can_down: boolean;
  is_original_image: boolean;
  roles: string[];
  must_otp: boolean;
  is_viewing: boolean;
  invite_remaining: number;
  is_have_emps: boolean;
  slot_remaining: number;
  size_upload: number;
  carrot: number;
  sign: UserSignInfo | null;
}

export interface SignInResponse {
  sign_index: number;
  earn_point: number;
  continuous_days: number;
}

export interface TemporaryPasswordResponse {
  password: number | string;
  second: number;
}

export interface ShowEmptyResponse {
  is_show_empty: boolean;
}

export interface PseudonymResponse {
  pseudonym: string;
}

export interface ApiErrorPayload {
  message: string;
}
