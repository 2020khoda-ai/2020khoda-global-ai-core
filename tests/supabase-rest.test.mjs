import assert from "node:assert/strict";
import { createSupabaseRestClient } from "../src/lib/supabase-rest.js";

const env = {
  SUPABASE_URL: "https://project-ref.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40)
};

assert.throws(
  () => createSupabaseRestClient({ SUPABASE_URL: env.SUPABASE_URL }),
  { code: "SUPABASE_CONFIGURATION_ERROR" }
);
assert.throws(
  () => createSupabaseRestClient({ ...env, SUPABASE_URL: "http://project-ref.supabase.co" }),
  { code: "SUPABASE_CONFIGURATION_ERROR" }
);

let captured;
const fakeFetch = async (url, init) => {
  captured = { url: String(url), init };
  return new Response(JSON.stringify([{ id: "lead-1" }]), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};

const client = createSupabaseRestClient(env, fakeFetch);
const result = await client.request("leads", {
  method: "GET",
  query: { select: "id,status", status: "eq.new" }
});

assert.deepEqual(result, [{ id: "lead-1" }]);
assert.equal(captured.url, "https://project-ref.supabase.co/rest/v1/leads?select=id%2Cstatus&status=eq.new");
assert.equal(captured.init.headers.get("apikey"), env.SUPABASE_SERVICE_ROLE_KEY);
assert.equal(captured.init.headers.get("cache-control"), null);
assert.equal(captured.init.cache, "no-store");
await assert.rejects(
  () => client.request("unknown_table"),
  /allowlist/
);

const failingClient = createSupabaseRestClient(env, async () =>
  new Response("sensitive upstream detail", { status: 403 })
);
await assert.rejects(
  () => failingClient.request("leads"),
  error => error.code === "SUPABASE_REQUEST_FAILED" &&
    error.status === 403 &&
    !error.message.includes("sensitive upstream detail")
);

console.log("PASS: Supabase REST adapter configuration, allowlist, headers, query and error handling.");
