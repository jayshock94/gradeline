-- Gradeline schema: one company (organization) per workspace; everything inside it is private to its members.
-- Run this in the Supabase SQL editor (or `supabase db push`). Safe to run once on a fresh project.

create extension if not exists pgcrypto;

-- ---------- companies and people ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'estimator' check (role in ('owner', 'estimator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'estimator' check (role in ('owner', 'estimator', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- ---------- estimating data ----------
-- The cost library (labor, equipment, materials, crews, vendors) is one JSON document per company.
create table public.libraries (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- A bid: the job being priced. Ids are client-made text so the app can create them offline.
create table public.bids (
  org_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  data jsonb not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (org_id, id)
);

-- The estimate for a bid: pay items, tasks, quote packages, markup and locked prices, as one document.
create table public.estimates (
  org_id uuid not null references public.organizations(id) on delete cascade,
  bid_id text not null,
  doc jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (org_id, bid_id),
  foreign key (org_id, bid_id) references public.bids (org_id, id) on delete cascade
);

-- Every change, with a snapshot, so undo and "jump back" work for everyone and survive a reload.
create table public.history (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  scope text not null,          -- 'estimate:<bid_id>' | 'library' | 'bids'
  version bigint not null,
  entry jsonb not null,         -- { title, detail, who, when, icon }
  snapshot jsonb not null,      -- the scope's document after this change
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index history_scope_idx on public.history (org_id, scope, version desc);

-- ---------- helpers ----------
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.can_edit(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'estimator'));
$$;

create or replace function public.is_owner(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'owner');
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger libraries_touch before update on public.libraries for each row execute function public.touch_updated_at();
create trigger bids_touch before update on public.bids for each row execute function public.touch_updated_at();
create trigger estimates_touch before update on public.estimates for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ---------- row level security ----------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.libraries enable row level security;
alter table public.bids enable row level security;
alter table public.estimates enable row level security;
alter table public.history enable row level security;

create policy "members read their company" on public.organizations for select using (public.is_member(id));
create policy "owners rename their company" on public.organizations for update using (public.is_owner(id));

create policy "members see the team" on public.memberships for select using (public.is_member(org_id));
create policy "owners manage the team" on public.memberships for delete using (public.is_owner(org_id) and user_id <> auth.uid());
create policy "owners change roles" on public.memberships for update using (public.is_owner(org_id));

create policy "own profile" on public.profiles for select using (
  user_id = auth.uid() or exists (
    select 1 from public.memberships a join public.memberships b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = profiles.user_id));
create policy "write own profile" on public.profiles for insert with check (user_id = auth.uid());
create policy "update own profile" on public.profiles for update using (user_id = auth.uid());

create policy "members see invites" on public.invites for select using (public.is_member(org_id));
create policy "owners invite" on public.invites for insert with check (public.is_owner(org_id));
create policy "owners cancel invites" on public.invites for delete using (public.is_owner(org_id));

create policy "members read library" on public.libraries for select using (public.is_member(org_id));
create policy "editors write library" on public.libraries for update using (public.can_edit(org_id));

create policy "members read bids" on public.bids for select using (public.is_member(org_id));
create policy "editors add bids" on public.bids for insert with check (public.can_edit(org_id));
create policy "editors change bids" on public.bids for update using (public.can_edit(org_id));
create policy "editors delete bids" on public.bids for delete using (public.can_edit(org_id));

create policy "members read estimates" on public.estimates for select using (public.is_member(org_id));
create policy "editors add estimates" on public.estimates for insert with check (public.can_edit(org_id));
create policy "editors change estimates" on public.estimates for update using (public.can_edit(org_id));
create policy "editors delete estimates" on public.estimates for delete using (public.can_edit(org_id));

create policy "members read history" on public.history for select using (public.is_member(org_id));
create policy "editors write history" on public.history for insert with check (public.can_edit(org_id));

-- ---------- onboarding and invites (run as the database, checked inside) ----------
-- Creates a company for the signed-in person, makes them owner, and seeds the library (and optional sample bids).
create or replace function public.create_organization(p_name text, p_library jsonb, p_bids jsonb default '[]'::jsonb, p_estimates jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_uid uuid := auth.uid(); b jsonb; e jsonb;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.organizations (name) values (coalesce(nullif(trim(p_name), ''), 'My company')) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.libraries (org_id, data, updated_by) values (v_org, coalesce(p_library, '{}'::jsonb), v_uid);
  insert into public.history (org_id, scope, version, entry, snapshot, user_id)
    values (v_org, 'library', 1, jsonb_build_object('title', 'Set up the cost library', 'icon', 'library_books', 'who', 'Setup', 'when', to_char(now(), 'HH12:MI AM')), coalesce(p_library, '{}'::jsonb), v_uid);
  for b in select * from jsonb_array_elements(coalesce(p_bids, '[]'::jsonb)) loop
    insert into public.bids (org_id, id, data, updated_by) values (v_org, b->>'id', b->'data', v_uid);
  end loop;
  for e in select * from jsonb_array_elements(coalesce(p_estimates, '[]'::jsonb)) loop
    insert into public.estimates (org_id, bid_id, doc, updated_by) values (v_org, e->>'bid_id', e->'doc', v_uid);
    insert into public.history (org_id, scope, version, entry, snapshot, user_id)
      values (v_org, 'estimate:' || (e->>'bid_id'), 1, jsonb_build_object('title', 'Opened sample estimate', 'icon', 'folder_open', 'who', 'Setup', 'when', to_char(now(), 'HH12:MI AM')), e->'doc', v_uid);
  end loop;
  return v_org;
end $$;

-- Joins every company that invited the signed-in person's email, then removes the invite. Call it right after sign-in.
create or replace function public.accept_invites() returns int
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; n int := 0; r record;
begin
  if v_uid is null then return 0; end if;
  select email into v_email from auth.users where id = v_uid;
  for r in select * from public.invites i where lower(i.email) = lower(v_email) loop
    insert into public.memberships (org_id, user_id, role) values (r.org_id, v_uid, r.role) on conflict do nothing;
    delete from public.invites where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Version-checked save of one scope with its history row, in one transaction.
-- Returns the new version, or null when someone else saved first (the caller refetches and retries).
create or replace function public.save_scope(p_org uuid, p_scope text, p_expected int, p_doc jsonb, p_entry jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_new int; v_bid text;
begin
  if not public.can_edit(p_org) then raise exception 'not allowed'; end if;
  if p_scope = 'library' then
    update public.libraries set data = p_doc, version = version + 1, updated_by = v_uid where org_id = p_org and version = p_expected returning version into v_new;
  elsif p_scope like 'estimate:%' then
    v_bid := substr(p_scope, 10);
    update public.estimates set doc = p_doc, version = version + 1, updated_by = v_uid where org_id = p_org and bid_id = v_bid and version = p_expected returning version into v_new;
    if v_new is null and not exists (select 1 from public.estimates where org_id = p_org and bid_id = v_bid) then
      insert into public.estimates (org_id, bid_id, doc, updated_by) values (p_org, v_bid, p_doc, v_uid) returning version into v_new;
    end if;
  else
    raise exception 'unknown scope %', p_scope;
  end if;
  if v_new is null then return null; end if;
  insert into public.history (org_id, scope, version, entry, snapshot, user_id) values (p_org, p_scope, v_new, p_entry, p_doc, v_uid);
  return v_new;
end $$;

-- ---------- live updates ----------
alter publication supabase_realtime add table public.estimates;
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.libraries;
