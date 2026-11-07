-- 2020KHODA GLOBAL AI CORE
-- Initial Supabase/Postgres target schema.
-- Candidate only: do not apply to production until reviewed and approved.
-- Server-side access only. RLS is enabled and no anon/authenticated policies are created.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'customer'
    check (role in ('admin','agent','owner','buyer','investor','referrer','customer')),
  status text not null default 'active'
    check (status in ('active','pending','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  assigned_to uuid references public.profiles(id) on delete set null,
  full_name text,
  phone text,
  email text,
  lead_type text not null default 'buyer'
    check (lead_type in ('buyer','owner','investor','referrer','partner','other')),
  source text not null default 'unknown',
  source_code text,
  message text,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','negotiation','converted','lost','archived')),
  score integer not null default 0 check (score between 0 and 100),
  consent_to_contact boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique,
  title text not null,
  property_type text,
  transaction_type text not null default 'sale'
    check (transaction_type in ('sale','rent','participation','investment')),
  province text,
  city text,
  address text,
  location geography(point, 4326),
  area_sqm numeric(14,2) check (area_sqm is null or area_sqm >= 0),
  asking_price numeric(20,2) check (asking_price is null or asking_price >= 0),
  currency text not null default 'IRR',
  owner_lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','active','reserved','under_contract','sold','withdrawn','archived')),
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_lead_id uuid references public.leads(id) on delete set null,
  referred_lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  referral_code text,
  reward_amount numeric(20,2) check (reward_amount is null or reward_amount >= 0),
  currency text not null default 'IRR',
  status text not null default 'registered'
    check (status in ('registered','qualified','converted','payable','paid','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referrer_lead_id is distinct from referred_lead_id)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  buyer_lead_id uuid references public.leads(id) on delete set null,
  owner_lead_id uuid references public.leads(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  deal_type text not null default 'sale'
    check (deal_type in ('sale','rent','participation','investment')),
  stage text not null default 'qualification'
    check (stage in ('qualification','due_diligence','negotiation','offer','contract','closing','completed','cancelled')),
  amount numeric(20,2) check (amount is null or amount >= 0),
  currency text not null default 'IRR',
  human_approval_required boolean not null default true,
  human_approved_at timestamptz,
  human_approved_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  channel text not null default 'web'
    check (channel in ('web','whatsapp','telegram','instagram','phone','email','other')),
  external_thread_id text,
  status text not null default 'open'
    check (status in ('open','pending','closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  sender_type text not null check (sender_type in ('customer','assistant','agent','system')),
  content text not null,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','completed','cancelled','overdue')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lead_id is not null or deal_id is not null)
);

create table if not exists public.human_approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead','property','deal','referral','payment','publication')),
  entity_id uuid not null,
  action text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
create index if not exists leads_phone_idx on public.leads(phone);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists properties_status_city_idx on public.properties(status, city);
create index if not exists properties_owner_idx on public.properties(owner_lead_id);
create index if not exists referrals_referrer_idx on public.referrals(referrer_lead_id, status);
create index if not exists deals_stage_updated_idx on public.deals(stage, updated_at desc);
create index if not exists conversations_lead_idx on public.conversations(lead_id, created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists follow_ups_due_idx on public.follow_ups(status, due_at);
create index if not exists human_approvals_pending_idx on public.human_approvals(status, created_at);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.properties enable row level security;
alter table public.referrals enable row level security;
alter table public.deals enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.follow_ups enable row level security;
alter table public.human_approvals enable row level security;
alter table public.audit_events enable row level security;

-- No client-facing policies are intentionally defined in this candidate.
-- The Worker integration must use a server-side secret stored in Cloudflare,
-- never a service-role key in browser code or this repository.
