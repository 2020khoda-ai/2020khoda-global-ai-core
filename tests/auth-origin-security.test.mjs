import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isSameOriginBrowserRequest, isUserSessionPath } from "../src/security/origin.js";

const request = (headers = {}) => new Request("https://crm.2020khoda.com/api/memory", { headers });
assert.equal(isSameOriginBrowserRequest(request({ Origin: "https://crm.2020khoda.com" })), true);
assert.equal(isSameOriginBrowserRequest(request({ Origin: "https://attacker.example" })), false);
assert.equal(isSameOriginBrowserRequest(request({ Origin: "null" })), false);
assert.equal(isSameOriginBrowserRequest(request({ "Sec-Fetch-Site": "same-origin" })), true);
assert.equal(isSameOriginBrowserRequest(request({ "Sec-Fetch-Site": "cross-site" })), false);
assert.equal(isSameOriginBrowserRequest(request()), false);

for (const path of [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/memory",
  "/api/memory/item-id",
  "/api/chats",
  "/api/chats/00000000-0000-4000-8000-000000000000",
  "/api/chat"
]) assert.equal(isUserSessionPath(path), true, path);

for (const path of ["/api/health", "/api/public/chat", "/api/lead", "/api/stats"]) {
  assert.equal(isUserSessionPath(path), false, path);
}

const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
assert.match(source, /import \{ isSameOriginBrowserRequest, isUserSessionPath \} from "\.\/security\/origin\.js";/);
assert.match(source, /function guestOriginAllowed\(request\) \{\s+return isSameOriginBrowserRequest\(request\);\s+\}/);
const routeStart = source.indexOf("async function routeRequest(request, env) {");
assert.notEqual(routeStart, -1);
const routeEnd = source.indexOf("\n}\n", routeStart);
assert.notEqual(routeEnd, -1);
const route = source.slice(routeStart, routeEnd + 3);
assert.match(route, /if \(method === "OPTIONS"\) \{\s+if \(!isSameOriginBrowserRequest\(request\)\)/);
assert.match(route, /if \(isUserSessionPath\(path\) && !isSameOriginBrowserRequest\(request\)\)/);
assert.ok(route.indexOf("if (isUserSessionPath(path)") < route.indexOf("return handleMemory(request, env)"));
const authStart = source.indexOf("async function handleAuth(request, env) {");
const authEnd = source.indexOf("\n}\n", authStart);
assert.notEqual(authStart, -1);
assert.match(source.slice(authStart, authEnd + 3), /if \(!isSameOriginBrowserRequest\(request\)\)/);

console.log("PASS: origin policy, cookie-auth route inventory, router integration and preflight contract.");
