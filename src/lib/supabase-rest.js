/**
 * 2020KHODA GLOBAL AI CORE — Supabase server-side REST adapter.
 *
 * Candidate foundation only. This module is intentionally not wired into the
 * production Worker router until endpoint/auth/RLS migration is reviewed.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must exist only as server secrets.
 */

const ALLOWED_TABLES = new Set([
  "profiles",
  "leads",
  "properties",
  "referrals",
  "deals",
  "conversations",
  "messages",
  "follow_ups",
  "human_approvals",
  "audit_events"
]);

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

function configurationError(message) {
  const error = new Error(message);
  error.code = "SUPABASE_CONFIGURATION_ERROR";
  return error;
}

function parseBaseUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw configurationError("SUPABASE_URL is not configured.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw configurationError("SUPABASE_URL is invalid.");
  }

  if (url.protocol !== "https:" || url.username || url.password ||
      url.search || url.hash || !url.hostname.endsWith(".supabase.co")) {
    throw configurationError("SUPABASE_URL must be a trusted HTTPS Supabase project URL.");
  }

  return url;
}

function normalizeQuery(query) {
  if (query == null) return "";
  if (typeof query !== "object" || Array.isArray(query)) {
    throw new TypeError("query must be a plain object.");
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
      throw new TypeError("Invalid query parameter name.");
    }
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else if (typeof value === "object") {
      throw new TypeError("Query parameter values must be scalar or arrays of scalars.");
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function createSupabaseRestClient(env, fetchImpl = fetch) {
  const baseUrl = parseBaseUrl(env?.SUPABASE_URL);
  const serviceRoleKey = env?.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof serviceRoleKey !== "string" || serviceRoleKey.length < 20) {
    throw configurationError("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A Fetch-compatible implementation is required.");
  }

  return Object.freeze({
    async request(table, options = {}) {
      if (!ALLOWED_TABLES.has(table)) {
        throw new TypeError("Table is not in the approved Supabase schema allowlist.");
      }

      const method = String(options.method || "GET").toUpperCase();
      if (!ALLOWED_METHODS.has(method)) {
        throw new TypeError("HTTP method is not allowed.");
      }

      const query = normalizeQuery(options.query);
      const url = new URL(`/rest/v1/${table}`, baseUrl);
      if (query) url.search = query;

      const headers = new Headers({
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json"
      });

      if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
      }
      if (options.returnRepresentation === true) {
        headers.set("Prefer", "return=representation");
      } else if (options.returnMinimal === true) {
        headers.set("Prefer", "return=minimal");
      }

      const response = await fetchImpl(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        redirect: "error",
        cache: "no-store"
      });

      if (!response.ok) {
        const error = new Error(`Supabase request failed with status ${response.status}.`);
        error.code = "SUPABASE_REQUEST_FAILED";
        error.status = response.status;
        throw error;
      }

      if (response.status === 204) return null;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Supabase returned an unexpected content type.");
      }
      return response.json();
    }
  });
}
