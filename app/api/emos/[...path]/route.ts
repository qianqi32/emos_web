import { buildEmosUrl } from "@/lib/api/env";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildProxyHeaders(request: Request) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  headers.set("accept", "application/json, text/plain, */*");
  headers.set("accept-language", "zh-CN,zh;q=0.9,en;q=0.8");
  headers.set("user-agent", BROWSER_USER_AGENT);

  return headers;
}

async function proxyRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const incomingUrl = new URL(request.url);
    const targetUrl = buildEmosUrl(path, incomingUrl.searchParams, request);
    const headers = buildProxyHeaders(request);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined,
      redirect: "manual"
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "EMOS API 代理请求失败" }, { status: 500 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
