/** M01-C: schema-aware Supabase repositories. Candidate only; not a D1 shim. */
import { createSupabaseRestClient } from "./supabase-rest.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEAD_FIELDS = new Set(["assigned_to", "full_name", "phone", "email", "lead_type", "source", "source_code", "message", "status", "score", "consent_to_contact", "metadata"]);
const LEAD_TYPES = new Set(["buyer", "owner", "investor", "referrer", "partner", "other"]);
const LEAD_STATUSES = new Set(["new", "contacted", "qualified", "negotiation", "converted", "lost", "archived"]);
const CHANNELS = new Set(["web", "whatsapp", "telegram", "instagram", "phone", "email", "other"]);
const DIRECTIONS = new Set(["inbound", "outbound", "internal"]);
const SENDERS = new Set(["customer", "assistant", "agent", "system"]);
const LEAD_COLUMNS = "id,assigned_to,full_name,phone,email,lead_type,source,source_code,message,status,score,consent_to_contact,metadata,created_at,updated_at";
const CONVERSATION_COLUMNS = "id,lead_id,channel,external_thread_id,status,metadata,created_at,updated_at";
const MESSAGE_COLUMNS = "id,conversation_id,direction,sender_type,content,provider_message_id,metadata,created_at";

function invalid(message) { const error = new TypeError(message); error.code = "SUPABASE_REPOSITORY_INVALID_INPUT"; throw error; }
function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid(`${label} must be a plain object.`);
}
function id(value, label = "id") { if (typeof value !== "string" || !UUID.test(value)) invalid(`${label} must be a UUID.`); }
function metadata(value) { if (value !== undefined) object(value, "metadata"); }
function limit(value = 50) { if (!Number.isInteger(value) || value < 1 || value > 100) invalid("limit must be an integer from 1 to 100."); return String(value); }
function lead(input, partial = false) {
  object(input, "lead");
  if (Object.keys(input).some(key => !LEAD_FIELDS.has(key))) invalid("lead contains an unsupported field.");
  if (input.full_name !== undefined && (typeof input.full_name !== "string" || input.full_name.length > 200)) invalid("full_name is invalid.");
  if (input.phone !== undefined && input.phone !== null && (typeof input.phone !== "string" || input.phone.length > 40)) invalid("phone is invalid.");
  if (input.email !== undefined && input.email !== null && input.email !== "" && (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))) invalid("email is invalid.");
  if (!partial && ![input.full_name, input.phone, input.email].some(value => typeof value === "string" && value.trim())) invalid("lead requires a non-empty contact field.");
  if (input.lead_type !== undefined && !LEAD_TYPES.has(input.lead_type)) invalid("lead_type is invalid.");
  if (input.status !== undefined && !LEAD_STATUSES.has(input.status)) invalid("lead status is invalid.");
  if (input.score !== undefined && (!Number.isInteger(input.score) || input.score < 0 || input.score > 100)) invalid("score must be from 0 to 100.");
  if (input.consent_to_contact !== undefined && typeof input.consent_to_contact !== "boolean") invalid("consent_to_contact must be boolean.");
  for (const key of ["source", "source_code", "message"]) if (input[key] != null && input[key] !== undefined && (typeof input[key] !== "string" || input[key].length > (key === "message" ? 8000 : 200))) invalid(`${key} is invalid.`);
  if (input.assigned_to != null && input.assigned_to !== undefined) id(input.assigned_to, "assigned_to");
  metadata(input.metadata);
}

export function createSupabaseRepository(env, fetchImpl = fetch) {
  const client = createSupabaseRestClient(env, fetchImpl);
  const leads = Object.freeze({
    list({ status, assignedTo, limit: count = 50 } = {}) {
      const query = { select: LEAD_COLUMNS, order: "created_at.desc", limit: limit(count) };
      if (status !== undefined) { if (!LEAD_STATUSES.has(status)) invalid("lead status filter is invalid."); query.status = `eq.${status}`; }
      if (assignedTo !== undefined) { id(assignedTo, "assignedTo"); query.assigned_to = `eq.${assignedTo}`; }
      return client.request("leads", { query });
    },
    async getById(leadId) { id(leadId); const rows = await client.request("leads", { query: { select: LEAD_COLUMNS, id: `eq.${leadId}`, limit: "1" } }); return rows[0] ?? null; },
    create(input) { lead(input); return client.request("leads", { method: "POST", body: input, returnRepresentation: true }); },
    update(leadId, patch) { id(leadId); lead(patch, true); if (!Object.keys(patch).length) invalid("lead update cannot be empty."); return client.request("leads", { method: "PATCH", query: { id: `eq.${leadId}` }, body: patch, returnRepresentation: true }); }
  });
  const conversations = Object.freeze({
    create(input) {
      object(input, "conversation");
      const allowed = new Set(["lead_id", "channel", "external_thread_id", "status", "metadata"]);
      if (Object.keys(input).some(key => !allowed.has(key))) invalid("conversation contains an unsupported field.");
      if (input.lead_id != null) id(input.lead_id, "lead_id");
      if (input.channel !== undefined && !CHANNELS.has(input.channel)) invalid("conversation channel is invalid.");
      if (input.status !== undefined && !["open", "pending", "closed"].includes(input.status)) invalid("conversation status is invalid.");
      metadata(input.metadata);
      return client.request("conversations", { method: "POST", body: input, returnRepresentation: true });
    },
    listByLead(leadId, { limit: count = 50 } = {}) { id(leadId, "leadId"); return client.request("conversations", { query: { select: CONVERSATION_COLUMNS, lead_id: `eq.${leadId}`, order: "created_at.desc", limit: limit(count) } }); }
  });
  const messages = Object.freeze({
    create(input) {
      object(input, "message");
      const allowed = new Set(["conversation_id", "direction", "sender_type", "content", "provider_message_id", "metadata"]);
      if (Object.keys(input).some(key => !allowed.has(key))) invalid("message contains an unsupported field.");
      id(input.conversation_id, "conversation_id");
      if (!DIRECTIONS.has(input.direction) || !SENDERS.has(input.sender_type)) invalid("message direction or sender_type is invalid.");
      if (typeof input.content !== "string" || !input.content.trim() || input.content.length > 12000) invalid("message content is invalid.");
      metadata(input.metadata);
      return client.request("messages", { method: "POST", body: input, returnRepresentation: true });
    },
    listByConversation(conversationId, { limit: count = 50 } = {}) { id(conversationId, "conversationId"); return client.request("messages", { query: { select: MESSAGE_COLUMNS, conversation_id: `eq.${conversationId}`, order: "created_at.asc", limit: limit(count) } }); }
  });
  return Object.freeze({ leads, conversations, messages });
}
