const TOKEN_STORAGE_KEY = "emos-token";
const CALLBACK_PARAM_KEYS = ["user_id", "username", "avatar", "token"];

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function readOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  if (!token) {
    return "";
  }

  CALLBACK_PARAM_KEYS.forEach((key) => params.delete(key));
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);

  return token;
}
