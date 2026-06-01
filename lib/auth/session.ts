const TOKEN_STORAGE_KEY = "emos-token";
const ACCOUNT_STORAGE_KEY = "emos-accounts";
const CALLBACK_PARAM_KEYS = ["user_id", "username", "avatar", "token"];

export interface StoredAccount {
  token: string;
  user_id: string;
  username: string;
  avatar?: string | null;
}

function readStoredAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    const accounts = raw ? (JSON.parse(raw) as StoredAccount[]) : [];
    return Array.isArray(accounts) ? accounts.filter((account) => account.token && account.user_id) : [];
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts: StoredAccount[]) {
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}

export function getStoredAccounts() {
  return readStoredAccounts();
}

export function saveStoredAccount(account: StoredAccount) {
  const accounts = readStoredAccounts().filter((item) => item.token !== account.token && item.user_id !== account.user_id);
  writeStoredAccounts([account, ...accounts]);
}

export function removeStoredAccount(token: string) {
  writeStoredAccounts(readStoredAccounts().filter((account) => account.token !== token));
}

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
