export interface SignCheckResponse {
  is_sign: boolean;
  user_id: string | null;
}

export type ApiEntity = Record<string, unknown>;

export interface PaginatedResponse<T = ApiEntity> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
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

export interface VideoGenre {
  id: number;
  name: string;
}

export interface VideoListItem {
  item_id?: number | null;
  todb_id?: number | null;
  tmdb_id?: number | null;
  tmdb_url?: string | null;
  video_id: number;
  video_type?: string | null;
  video_title?: string | null;
  video_origin_title?: string | null;
  video_description?: string | null;
  video_tagline?: string | null;
  video_image_logo?: string | null;
  video_image_poster?: string | null;
  video_image_backdrop?: string | null;
  video_date_air?: string | null;
  video_is_adult?: boolean | null;
  seek_is_request?: boolean | null;
  seek_id?: string | number | null;
  request_count?: number | null;
  parts_count?: number | null;
  medias_count?: number | null;
  subtitles_count?: number | null;
  titles?: unknown[];
  genres?: VideoGenre[];
  is_delete?: boolean | null;
  [key: string]: unknown;
}

export type VideoListResponse = PaginatedResponse<VideoListItem>;

export interface VideoSeasonItem {
  item_id: string;
  season_id: number;
  season_title: string;
  season_number: number;
  season_description?: string | null;
  video_image_poster?: string | null;
  date_air?: string | null;
  has_media?: boolean | null;
  episodes_count?: number | null;
  [key: string]: unknown;
}

export interface VideoEpisodeItem {
  item_id: string;
  season_id: number;
  season_number: number;
  episode_id: number;
  episode_title: string;
  episode_number: number;
  episode_description?: string | null;
  video_image_poster?: string | null;
  date_air?: string | null;
  runtime?: number | null;
  parts_count?: number | null;
  medias_count?: number | null;
  subtitles_count?: number | null;
  [key: string]: unknown;
}

export interface VideoMediaItem {
  media_id: string;
  media_name?: string | null;
  media_status?: string | null;
  media_file_size?: number | null;
  media_file_second?: number | null;
  user_pseudonym?: string | null;
  subtitle_count?: number | null;
  is_self_upload?: boolean | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface VideoSubtitleItem {
  subtitle_id: string;
  subtitle_title?: string | null;
  subtitle_codec?: string | null;
  user_pseudonym?: string | null;
  is_self_upload?: boolean | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface MediaPlayUrlResponse {
  url: string;
  [key: string]: unknown;
}

export interface CarrotMutationResponse extends MutationResponse {
  carrot?: number;
}

export interface WatchMaintainer {
  user_id: string;
  username: string;
  avatar?: string | null;
  [key: string]: unknown;
}

export interface WatchAuthor {
  user_id: string;
  username: string;
  avatar?: string | null;
  [key: string]: unknown;
}

export interface WatchListItem {
  subscribe_id?: number | null;
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  carrot?: number | null;
  point?: number | null;
  tags: string[];
  image_poster?: string | null;
  image_poster_url?: string | null;
  is_show_empty: boolean;
  is_self: boolean;
  is_edit_video?: boolean | null;
  is_subscribe: boolean;
  user_is_show?: boolean | null;
  user_sort?: number | null;
  subscribe_count?: number | null;
  video_count?: number | null;
  maintainers?: WatchMaintainer[];
  author?: WatchAuthor | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type WatchListResponse = PaginatedResponse<WatchListItem>;

export interface WatchSaveResponse {
  watch_id: number;
  count?: number;
  [key: string]: unknown;
}

export interface WatchSlotResponse {
  slot_remaining: number;
  [key: string]: unknown;
}

export interface WatchSubscribeResponse {
  is_subscribe: boolean;
  [key: string]: unknown;
}

export interface WatchShowResponse {
  is_show: boolean;
  [key: string]: unknown;
}

export interface SeekListItem {
  id: number;
  video_type: string;
  todb_id?: number | null;
  tmdb_id?: number | null;
  video_title_display: string;
  video_list_id?: number | null;
  video_season_id?: number | null;
  video_season_number?: number | null;
  video_episode_id?: number | null;
  video_episode_number?: number | null;
  count_request: number;
  status: string;
  upload_expired_at?: string | null;
  updated_at?: string | null;
  video_title?: string | null;
  video_image_logo?: string | null;
  video_image_poster?: string | null;
  video_image_backdrop?: string | null;
  tmdb_url?: string | null;
  upload_username?: string | null;
  is_can_claim?: boolean | null;
  item_id: string;
  seek_carrot: number;
  seek_is_request?: boolean | null;
  [key: string]: unknown;
}

export type SeekListResponse = PaginatedResponse<SeekListItem>;

export interface SeekApplyResponse {
  seek_is_request: boolean;
  [key: string]: unknown;
}

export interface SeekQueryResponse {
  seek_id: number;
  status: string;
  upload_username?: string | null;
  upload_expired_at?: string | null;
  is_can_claim?: boolean | null;
  request_count?: number | null;
  seek_carrot?: number | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface SeekHistoryItem {
  username: string;
  carrot: number;
  created_at: string;
  [key: string]: unknown;
}

export interface SeekClaimResponse {
  status: string;
  [key: string]: unknown;
}

export interface SeekUrgeResponse {
  seek_carrot: number;
  [key: string]: unknown;
}

export interface ProxyLineItem {
  id: number;
  name?: string | null;
  url?: string | null;
  tagline?: string | null;
  is_self?: boolean | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface ProxyLineCreateResponse {
  id: number;
  [key: string]: unknown;
}

export interface UploadTokenResponse {
  type: string;
  file_id: string;
  data: {
    upload_url: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UploadVideoBaseMediaItem {
  media_id?: string;
  media_name?: string;
  media_file_size?: number;
  user_pseudonym?: string;
  is_self_upload?: boolean;
  [key: string]: unknown;
}

export interface UploadVideoBaseResponse {
  title: string;
  video_medias?: UploadVideoBaseMediaItem[];
  [key: string]: unknown;
}

export interface SaveVideoUploadResponse {
  count: number;
  media_id: string;
  carrot: number;
  [key: string]: unknown;
}

export interface SaveSubtitleUploadResponse {
  carrot: number;
  subtitle_id: string;
  [key: string]: unknown;
}

export interface DeviceSession {
  device_client?: string | null;
  device_name?: string | null;
  device_id?: string | null;
  device_version?: string | null;
  last_used_at?: string | null;
  [key: string]: unknown;
}

export interface LogoutDeviceResponse {
  logout_count: number;
  [key: string]: unknown;
}

export interface ShowEmptyResponse {
  is_show_empty: boolean;
}

export interface PseudonymResponse {
  pseudonym: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: unknown;
}
