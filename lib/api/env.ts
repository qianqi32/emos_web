const DEFAULT_API_BASE_URL = "https://emos.best";

export function getEmosApiBaseUrl(request?: Request) {
  const apiHost = request?.headers.get("x-emos-api-host")?.trim();
  return apiHost || process.env.EMOS_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export function buildEmosUrl(pathSegments: string[], searchParams: URLSearchParams, request?: Request) {
  const apiBaseUrl = getEmosApiBaseUrl(request);

  const baseUrl = apiBaseUrl.replace(/\/$/, "");
  const normalizedPathSegments = baseUrl.endsWith("/api") && pathSegments[0] === "api" ? pathSegments.slice(1) : pathSegments;
  const path = normalizedPathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  const url = new URL(path ? `${baseUrl}/${path}` : baseUrl);

  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
}
