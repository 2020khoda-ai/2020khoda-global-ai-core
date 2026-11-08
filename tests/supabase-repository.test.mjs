import assert from "node:assert/strict";
import { createSupabaseRepository } from "../src/lib/supabase-repository.js";

const env = { SUPABASE_URL: "https://project-ref.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40) };
const requests = [];
const fakeFetch = async (url, init) => {
  requests.push({ url: String(url), init });
  return new Response(JSON.stringify([{ id: "123e4567-e89b-42d3-a456-426614174000" }]), { status: 200, headers: { "content-type": "application/json" } });
};
const repository = createSupabaseRepository(env, fakeFetch);
const id = "123e4567-e89b-42d3-a456-426614174000";

await repository.leads.create({ full_name: "Test Lead", phone: "+10000000000", lead_type: "buyer", status: "new", score: 10, consent_to_contact: false, metadata: {} });
assert.match(requests.at(-1).url, /\/rest\/v1\/leads$/);
assert.equal(requests.at(-1).init.method, "POST");
assert.equal(requests.at(-1).init.headers.get("prefer"), "return=representation");
assert.equal(requests.at(-1).init.headers.get("authorization"), `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);

await repository.leads.list({ status: "new", limit: 10 });
assert.match(requests.at(-1).url, /status=eq\.new/);
assert.match(requests.at(-1).url, /limit=10/);
await repository.leads.getById(id);
assert.match(requests.at(-1).url, /id=eq\./);
await repository.leads.update(id, { status: "qualified", score: 80 });
assert.equal(requests.at(-1).init.method, "PATCH");
await repository.conversations.create({ lead_id: id, channel: "web", status: "open", metadata: {} });
assert.match(requests.at(-1).url, /\/rest\/v1\/conversations$/);
await repository.messages.create({ conversation_id: id, direction: "inbound", sender_type: "customer", content: "Hello" });
assert.match(requests.at(-1).url, /\/rest\/v1\/messages$/);

const count = requests.length;
assert.throws(() => repository.leads.create({ name: "Legacy D1 field" }), { code: "SUPABASE_REPOSITORY_INVALID_INPUT" });
assert.throws(() => repository.leads.create({ full_name: "Bad", ai_score: 4 }), { code: "SUPABASE_REPOSITORY_INVALID_INPUT" });
assert.throws(() => repository.leads.update(id, { status: "unknown" }), { code: "SUPABASE_REPOSITORY_INVALID_INPUT" });
assert.throws(() => repository.leads.list({ limit: 101 }), { code: "SUPABASE_REPOSITORY_INVALID_INPUT" });
assert.throws(() => repository.messages.create({ conversation_id: "bad", direction: "inbound", sender_type: "customer", content: "x" }), { code: "SUPABASE_REPOSITORY_INVALID_INPUT" });
assert.equal(requests.length, count, "invalid inputs must not trigger network requests");
assert.ok(Object.isFrozen(repository));
console.log("PASS: Supabase repository contract, validation, filters and write operations.");
