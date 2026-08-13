import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  LEAD_MAX_BODY_BYTES,
  LEAD_REQUEST_HEADER,
  LEAD_REQUEST_HEADER_VALUE,
  validateLeadSubmission,
} from "./lib/lead-validation";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

type RuntimeEnvironment = Record<string, unknown>;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let rateLimitChecks = 0;

function runtimeValue(env: unknown, key: string): string | undefined {
  const runtime = env && typeof env === "object" ? (env as RuntimeEnvironment)[key] : undefined;
  if (typeof runtime === "string" && runtime.trim()) return runtime.trim();

  const processEnvironment = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  const processValue = processEnvironment?.[key];
  if (processValue?.trim()) return processValue.trim();

  const buildValue = ((import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {})[
    key
  ];
  return typeof buildValue === "string" && buildValue.trim() ? buildValue.trim() : undefined;
}

function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function configuredSiteOrigin(env: unknown): string | undefined {
  return normalizeOrigin(
    runtimeValue(env, "PUBLIC_SITE_ORIGIN") ??
      runtimeValue(env, "SITE_ORIGIN") ??
      runtimeValue(env, "VITE_SITE_ORIGIN"),
  );
}

function configuredAllowedOrigins(env: unknown): Set<string> {
  const values = [
    runtimeValue(env, "PUBLIC_SITE_ORIGIN"),
    runtimeValue(env, "SITE_ORIGIN"),
    runtimeValue(env, "VITE_SITE_ORIGIN"),
    ...(runtimeValue(env, "LEAD_ALLOWED_ORIGINS")?.split(",") ?? []),
  ];
  return new Set(values.map((value) => normalizeOrigin(value?.trim())).filter(Boolean) as string[]);
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

function requestHasTrustedOrigin(request: Request, env: unknown): boolean {
  const origin = normalizeOrigin(request.headers.get("origin") ?? undefined);
  if (!origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const allowed = configuredAllowedOrigins(env);
  if (allowed.size > 0) return allowed.has(origin);

  return isLocalOrigin(origin) && origin === new URL(request.url).origin;
}

function clientIdentifier(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unavailable"
  );
}

async function opaqueRateLimitKey(request: Request): Promise<string> {
  const source = `${clientIdentifier(request)}|${request.headers.get("user-agent") ?? "unknown"}`;
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(request: Request, now = Date.now()) {
  if (++rateLimitChecks % 100 === 0) {
    for (const [key, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
    }
  }

  const key = await opaqueRateLimitKey(request);
  const existing = rateLimitBuckets.get(key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
      : existing;
  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function jsonResponse(body: unknown, status: number, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

async function handleLeadRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405, { allow: "POST" });
  }

  if (!requestHasTrustedOrigin(request, env)) {
    return jsonResponse({ ok: false, code: "request_rejected" }, 403);
  }
  if (request.headers.get(LEAD_REQUEST_HEADER) !== LEAD_REQUEST_HEADER_VALUE) {
    return jsonResponse({ ok: false, code: "request_rejected" }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ ok: false, code: "unsupported_media_type" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > LEAD_MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, code: "payload_too_large" }, 413);
  }

  const rateLimit = await consumeRateLimit(request);
  const rateHeaders = {
    "ratelimit-limit": String(RATE_LIMIT_MAX),
    "ratelimit-remaining": String(rateLimit.remaining),
    "ratelimit-reset": String(Math.ceil(rateLimit.resetAt / 1_000)),
  };
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000));
    console.warn("[lead] rate limited", { reason: "threshold" });
    return jsonResponse({ ok: false, code: "rate_limited" }, 429, {
      ...rateHeaders,
      "retry-after": String(retryAfter),
    });
  }

  let rawBody: string;
  let payload: unknown;
  try {
    rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > LEAD_MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, code: "payload_too_large" }, 413, rateHeaders);
    }
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, code: "invalid_json" }, 400, rateHeaders);
  }

  const validation = validateLeadSubmission(payload);
  if (!validation.success) {
    return jsonResponse(
      { ok: false, code: "validation_error", fieldErrors: validation.fieldErrors },
      422,
      rateHeaders,
    );
  }

  const id = crypto.randomUUID();
  if (validation.suspicious) {
    console.info("[lead] suppressed", { requestId: id, reason: "anti_spam" });
    return jsonResponse({ ok: true, requestId: id }, 202, rateHeaders);
  }

  const requestOrigin = new URL(request.url).origin;
  if (isLocalOrigin(requestOrigin) || runtimeValue(env, "NODE_ENV") === "test") {
    console.info("[lead] preview accepted without persistence", {
      requestId: id,
      moduleCount: validation.data.modules.length,
    });
    return jsonResponse(
      { ok: true, requestId: id, preview: true, persisted: false },
      202,
      rateHeaders,
    );
  }

  // Production deliberately fails closed until a reviewed first-party lead-system
  // binding is implemented. Submitted values are not logged, stored, or forwarded.
  console.error("[lead] delivery unavailable", { requestId: id, reason: "sink_unconfigured" });
  return jsonResponse({ ok: false, code: "delivery_unavailable" }, 503, rateHeaders);
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

function isIndexableDeployment(request: Request, env: unknown): boolean {
  const origin = configuredSiteOrigin(env);
  return Boolean(
    origin &&
    new URL(request.url).origin === origin &&
    runtimeValue(env, "DEPLOYMENT_ENV") === "production" &&
    isEnabled(runtimeValue(env, "ALLOW_INDEXING")),
  );
}

function crawlResponse(request: Request, env: unknown): Response | undefined {
  const pathname = new URL(request.url).pathname;
  if (pathname !== "/robots.txt" && pathname !== "/sitemap.xml") return undefined;

  const indexable = isIndexableDeployment(request, env);
  const origin = configuredSiteOrigin(env);
  if (pathname === "/robots.txt") {
    const body =
      indexable && origin
        ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
        : "User-agent: *\nDisallow: /\n";
    return new Response(body, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const body =
    indexable && origin
      ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc></url>\n</urlset>\n`
      : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

function frameAncestors(env: unknown): string {
  const configured = runtimeValue(env, "FRAME_ANCESTORS")?.split(",") ?? [];
  const origins = configured
    .map((value) => normalizeOrigin(value.trim()))
    .filter(Boolean) as string[];
  return origins.length > 0 ? ["'self'", ...origins].join(" ") : "'none'";
}

function applySecurityHeaders(response: Response, request: Request, env: unknown): Response {
  const headers = new Headers(response.headers);
  const ancestors = frameAncestors(env);
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `frame-ancestors ${ancestors}`,
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    // MediaPipe WASM + landmark models are self-hosted under /mediapipe, so no
    // third-party script/connect origins are needed for AR try-on.
    "connect-src 'self'",
    "manifest-src 'self'",
  ].join("; ");

  headers.set("content-security-policy", csp);
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("permissions-policy", "camera=(self), microphone=(), geolocation=(), payment=()");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-content-type-options", "nosniff");
  if (ancestors === "'none'") headers.set("x-frame-options", "DENY");

  if (!isIndexableDeployment(request, env)) {
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  }
  const siteOrigin = configuredSiteOrigin(env);
  if (siteOrigin?.startsWith("https://") && new URL(request.url).origin === siteOrigin) {
    headers.set("strict-transport-security", "max-age=31536000");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/api/leads") {
        return applySecurityHeaders(await handleLeadRequest(request, env), request, env);
      }

      const crawl = crawlResponse(request, env);
      if (crawl) return applySecurityHeaders(crawl, request, env);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applySecurityHeaders(await normalizeCatastrophicSsrResponse(response), request, env);
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(brandedErrorResponse(), request, env);
    }
  },
};
