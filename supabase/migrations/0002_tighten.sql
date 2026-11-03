-- Gradeline 0002: tighter rules after the first security review.
--  - Estimates, the cost library and history can only be written through save_scope (version check + history row),
--    not straight over the API. The server stamps who made each change.
--  - Versions are bigint and set by the server (bids get a trigger), so nobody can jump or wrap them.
--  - Invites only work for an email address the person has confirmed, and they expire.
--  - Members can only have their role changed (nothing else), and a company always keeps at least one owner.
--  - Signed-out visitors can't call any function; create_organization has size and count limits.
-- Safe to run once on a database that has 0001_init.sql.

-- ---------- versions: bigint, server-managed ----------
alter table public.libraries alter column version type bigint;
alter table public.bids alter column version type bigint;
alter table public.estimates alter column version type bigint;

create or replace function public.bids_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
  else
    new.version := old.version + 1;
    new.org_id := old.org_id;
    new.id := old.id;
  end if;
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger bids_stamp before insert or update on public.bids for each row execute function public.bids_stamp();

alter function public.touch_updated_at() set search_path = '';

-- ---------- writes only through save_scope ----------
drop policy if exists "editors write library" on public.libraries;
drop policy if exists "editors add estimates" on public.estimates;
drop policy if exists "editors change estimates" on public.estimates;
drop policy if exists "editors delete estimates" on public.estimates;
drop policy if exists "editors write history" on public.history;

drop function if exists public.save_scope(uuid, text, int, jsonb, jsonb);
create function public.save_scope(p_org uuid, p_scope text, p_expected bigint, p_doc jsonb, p_entry jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_new bigint; v_bid text; v_who text; v_entry jsonb;
begin
  if v_uid is null or not public.can_edit(p_org) then raise exception 'not allowed'; end if;
  if p_doc is null or octet_length(p_doc::text) > 5000000 then raise exception 'That document is too large to save.'; end if;
  select coalesce(nullif(trim(display_name), ''), email) into v_who from public.profiles where user_id = v_uid;
  v_entry := coalesce(p_entry, '{}'::jsonb) || jsonb_build_object('who', coalesce(v_who, 'Someone'));
  if p_scope = 'library' then
    update public.libraries set data = p_doc, version = version + 1, updated_by = v_uid
      where org_id = p_org and version = p_expected returning version into v_new;
  elsif p_scope like 'estimate:%' then
    v_bid := substr(p_scope, 10);
    update public.estimates set doc = p_doc, version = version + 1, updated_by = v_uid
      where org_id = p_org and bid_id = v_bid and version = p_expected returning version into v_new;
    if v_new is null and not exists (select 1 from public.estimates where org_id = p_org and bid_id = v_bid) then
      insert into public.estimates (org_id, bid_id, doc, updated_by) values (p_org, v_bid, p_doc, v_uid) returning version into v_new;
    end if;
  else
    raise exception 'unknown scope %', p_scope;
  end if;
  if v_new is null then return null; end if;
  insert into public.history (org_id, scope, version, entry, snapshot, user_id) values (p_org, p_scope, v_new, v_entry, p_doc, v_uid);
  return v_new;
end $$;

-- ---------- invites: confirmed email only, and they expire ----------
alter table public.invites add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

create or replace function public.accept_invites() returns int
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; n int := 0; r record;
begin
  if v_uid is null then return 0; end if;
  select email into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  for r in select * from public.invites i where lower(i.email) = lower(v_email) and i.expires_at > now() loop
    insert into public.memberships (org_id, user_id, role) values (r.org_id, v_uid, r.role) on conflict do nothing;
    delete from public.invites where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- members: only the role can change, and someone always owns the company ----------
revoke update on public.memberships from authenticated, anon;
grant update (role) on public.memberships to authenticated;

create or replace function public.keep_an_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner') or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    -- a company being deleted, or a user account being deleted, may take its last owner with it
    if exists (select 1 from public.organizations o where o.id = old.org_id)
       and exists (select 1 from auth.users u where u.id = old.user_id)
       and not exists (select 1 from public.memberships m where m.org_id = old.org_id and m.role = 'owner' and m.user_id <> old.user_id) then
      raise exception 'A company needs at least one owner. Make someone else an owner first.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger memberships_keep_owner before update or delete on public.memberships for each row execute function public.keep_an_owner();

-- ---------- onboarding with limits ----------
create or replace function public.create_organization(p_name text, p_library jsonb, p_bids jsonb default '[]'::jsonb, p_estimates jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_uid uuid := auth.uid(); b jsonb; e jsonb;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.memberships where user_id = v_uid and role = 'owner') >= 5 then raise exception 'You already own 5 companies.'; end if;
  if octet_length(coalesce(p_library, '{}'::jsonb)::text) + octet_length(coalesce(p_bids, '[]'::jsonb)::text) + octet_length(coalesce(p_estimates, '[]'::jsonb)::text) > 5000000 then
    raise exception 'That starting data is too large.';
  end if;
  insert into public.organizations (name) values (coalesce(nullif(left(trim(p_name), 120), ''), 'My company')) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.libraries (org_id, data, updated_by) values (v_org, coalesce(p_library, '{}'::jsonb), v_uid);
  insert into public.history (org_id, scope, version, entry, snapshot, user_id)
    values (v_org, 'library', 1, jsonb_build_object('title', 'Set up the cost library', 'icon', 'library_books', 'who', 'Setup', 'when', to_char(now(), 'HH12:MI AM')), coalesce(p_library, '{}'::jsonb), v_uid);
  for b in select * from jsonb_array_elements(coalesce(p_bids, '[]'::jsonb)) loop
    insert into public.bids (org_id, id, data) values (v_org, b->>'id', b->'data');
  end loop;
  for e in select * from jsonb_array_elements(coalesce(p_estimates, '[]'::jsonb)) loop
    insert into public.estimates (org_id, bid_id, doc, updated_by) values (v_org, e->>'bid_id', e->'doc', v_uid);
    insert into public.history (org_id, scope, version, entry, snapshot, user_id)
      values (v_org, 'estimate:' || (e->>'bid_id'), 1, jsonb_build_object('title', 'Opened sample estimate', 'icon', 'folder_open', 'who', 'Setup', 'when', to_char(now(), 'HH12:MI AM')), e->'doc', v_uid);
  end loop;
  return v_org;
end $$;

-- ---------- who can call what ----------
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;
grant execute on function public.is_member(uuid), public.can_edit(uuid), public.is_owner(uuid) to authenticated;
grant execute on function public.create_organization(text, jsonb, jsonb, jsonb), public.accept_invites(), public.save_scope(uuid, text, bigint, jsonb, jsonb) to authenticated;
