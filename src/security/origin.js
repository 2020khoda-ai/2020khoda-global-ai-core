const SAME_ORIGIN_FETCH_SITE = "same-origin";

/**
 * Reject cross-origin browser requests on cookie-authenticated routes.
 * If Origin is absent, require Fetch Metadata to explicitly identify a
 * same-origin browser request. No cross-origin allowlist is enabled here.
 */
export function isSameOriginBrowserRequest(request) {
  const origin = request.headers.get("Origin");

  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      return parsedOrigin.origin === origin &&
        parsedOrigin.origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }

  return request.headers.get("Sec-Fetch-Site") === SAME_ORIGIN_FETCH_SITE;
}

export function isUserSessionPath(path) {
  return path === "/api/auth" ||
    path.startsWith("/api/auth/") ||
    path === "/api/memory" ||
    path.startsWith("/api/memory/") ||
    path === "/api/chats" ||
    path.startsWith("/api/chats/") ||
    path === "/api/chat";
}
