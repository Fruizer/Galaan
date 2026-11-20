-- Galaan's initial Supabase schema. RLS scopes all circle data to membership.

create extension if not exists pgcrypto with schema extensions;

do $$ begin create type public.circle_role as enum ('organizer', 'member');
exception when duplicate_object then null; end $$;
do $$ begin create type public.gala_vibe as enum ('Food Trip', 'Roadtrip', 'Tambay', 'Beach Day', 'Coffee Run', 'Birthday');
exception when duplicate_object then null; end $$;
do $$ begin create type public.rsvp_status as enum ('going', 'maybe', 'not-going');
exception when duplicate_object then null; end $$;
do $$ begin create type public.expense_category as enum ('stay', 'food', 'transpo', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Barkada member' check (char_length(btrim(display_name)) between 1 and 60),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circle_memberships (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.circle_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table if not exists public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses integer check (max_uses is null or max_uses between 1 and 500),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz
);

create table if not exists public.galas (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  vibe public.gala_vibe not null,
  event_date date not null,
  call_time time,
  gc_time time,
  venue text not null default '' check (char_length(venue) <= 160),
  address text not null default '' check (char_length(address) <= 300),
  notes text not null default '' check (char_length(notes) <= 4000),
  quorum smallint not null check (quorum between 2 and 100),
  created_by uuid not null references auth.users(id) on delete restrict,
  recap_note text not null default '' check (char_length(recap_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  gala_id uuid not null references public.galas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.rsvp_status not null default 'maybe',
  signature_payload text check (signature_payload is null or (
    char_length(signature_payload) <= 16000 and
    signature_payload ~ '^data:image/(png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
  )),
  updated_at timestamptz not null default now(),
  primary key (gala_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  gala_id uuid not null references public.galas(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  category public.expense_category not null default 'other',
  amount numeric(12,2) not null check (amount > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_paid boolean not null default false,
  paid_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (expense_id, user_id),
  check ((is_paid and paid_at is not null) or (not is_paid and paid_at is null))
);

create table if not exists public.gala_albums (
  id uuid primary key default gen_random_uuid(),
  gala_id uuid not null references public.galas(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  url text not null check (char_length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (gala_id, url)
);

create index if not exists circle_memberships_user_idx on public.circle_memberships(user_id, circle_id);
create index if not exists circle_invites_active_idx on public.circle_invites(circle_id, expires_at) where revoked_at is null;
create index if not exists galas_circle_date_idx on public.galas(circle_id, event_date);
create index if not exists rsvps_user_idx on public.rsvps(user_id, gala_id);
create index if not exists expenses_gala_idx on public.expenses(gala_id);
create index if not exists expense_payments_user_idx on public.expense_payments(user_id, expense_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public.set_payment_audit_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.is_paid then new.paid_at := coalesce(new.paid_at, now()); else new.paid_at := null; end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists circles_set_updated_at on public.circles;
create trigger circles_set_updated_at before update on public.circles for each row execute function public.set_updated_at();
drop trigger if exists galas_set_updated_at on public.galas;
create trigger galas_set_updated_at before update on public.galas for each row execute function public.set_updated_at();
drop trigger if exists rsvps_set_updated_at on public.rsvps;
create trigger rsvps_set_updated_at before update on public.rsvps for each row execute function public.set_updated_at();
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
drop trigger if exists expense_payments_set_audit on public.expense_payments;
create trigger expense_payments_set_audit before insert or update on public.expense_payments for each row execute function public.set_payment_audit_fields();

-- SECURITY DEFINER helpers avoid recursive RLS checks on membership rows.
create or replace function public.is_circle_member(p_circle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_memberships cm where cm.circle_id = p_circle_id and cm.user_id = auth.uid());
$$;

create or replace function public.is_circle_organizer(p_circle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_memberships cm where cm.circle_id = p_circle_id and cm.user_id = auth.uid() and cm.role = 'organizer'::public.circle_role);
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_profile_id = auth.uid() or exists (
    select 1 from public.circle_memberships mine
    join public.circle_memberships theirs on theirs.circle_id = mine.circle_id
    where mine.user_id = auth.uid() and theirs.user_id = p_profile_id
  );
$$;

-- New OAuth/email users get a small public profile; provider metadata is bounded.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_avatar text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Barkada member'
  );
  v_avatar := nullif(new.raw_user_meta_data ->> 'avatar_url', '');
  if v_avatar is not null and (char_length(v_avatar) > 2048 or v_avatar !~ '^https://') then v_avatar := null; end if;
  insert into public.profiles(id, display_name, avatar_url)
  values (new.id, left(v_name, 60), v_avatar) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_galaan on auth.users;
create trigger on_auth_user_created_galaan after insert on auth.users for each row execute function public.handle_new_auth_user();

-- Circle creation always creates its first organizer atomically.
create or replace function public.create_circle(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_circle_id uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if char_length(v_name) not between 2 and 60 then raise exception 'Circle name must be 2 to 60 characters'; end if;
  insert into public.circles(name, created_by) values (v_name, v_user_id) returning id into v_circle_id;
  insert into public.circle_memberships(circle_id, user_id, role) values (v_circle_id, v_user_id, 'organizer');
  return v_circle_id;
end;
$$;

-- The client generates 32 random bytes as 64 lowercase hex chars. Only SHA-256 is stored.
create or replace function public.create_circle_invite(p_circle_id uuid, p_token text, p_expires_at timestamptz, p_max_uses integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.is_circle_organizer(p_circle_id) then raise exception 'Organizer access required' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invite token must be 32 random bytes encoded as lowercase hex'; end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then raise exception 'Invite expiry must be within the next 30 days'; end if;
  if p_max_uses is not null and p_max_uses not between 1 and 500 then raise exception 'Invite use limit must be 1 to 500'; end if;
  insert into public.circle_invites(circle_id, token_hash, created_by, expires_at, max_uses)
  values (p_circle_id, encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex'), auth.uid(), p_expires_at, p_max_uses)
  returning id into v_id;
  return v_id;
end;
$$;

-- Row lock prevents two simultaneous redeems from exceeding max_uses.
create or replace function public.redeem_circle_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_invite public.circle_invites%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in before joining a circle' using errcode = '28000'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invite link' using errcode = '22023'; end if;
  select * into v_invite from public.circle_invites ci
  where ci.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex') for update;
  if not found or v_invite.revoked_at is not null or v_invite.expires_at <= now() then raise exception 'This invite link has expired or was revoked' using errcode = '22023'; end if;
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then raise exception 'This invite link reached its use limit' using errcode = '22023'; end if;
  if exists (select 1 from public.circle_memberships cm where cm.circle_id = v_invite.circle_id and cm.user_id = v_user_id) then return v_invite.circle_id; end if;
  insert into public.circle_memberships(circle_id, user_id, role) values (v_invite.circle_id, v_user_id, 'member');
  update public.circle_invites set use_count = use_count + 1 where id = v_invite.id;
  return v_invite.circle_id;
end;
$$;

create or replace function public.revoke_circle_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.circle_invites ci set revoked_at = now()
  where ci.id = p_invite_id and ci.revoked_at is null and public.is_circle_organizer(ci.circle_id);
  if not found then raise exception 'Invite not found or organizer access required' using errcode = '42501'; end if;
end;
$$;

create or replace function public.set_circle_member_role(p_circle_id uuid, p_user_id uuid, p_role public.circle_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old_role public.circle_role;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.is_circle_organizer(p_circle_id) then raise exception 'Organizer access required' using errcode = '42501'; end if;
  select role into v_old_role from public.circle_memberships where circle_id = p_circle_id and user_id = p_user_id for update;
  if not found then raise exception 'Circle member not found'; end if;
  if v_old_role = 'organizer' and p_role = 'member' and (select count(*) from public.circle_memberships where circle_id = p_circle_id and role = 'organizer') <= 1 then
    raise exception 'Promote another organizer before demoting the last organizer';
  end if;
  update public.circle_memberships set role = p_role where circle_id = p_circle_id and user_id = p_user_id;
end;
$$;

create or replace function public.remove_circle_member(p_circle_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.circle_role;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.is_circle_organizer(p_circle_id) then raise exception 'Organizer access required' using errcode = '42501'; end if;
  select role into v_role from public.circle_memberships where circle_id = p_circle_id and user_id = p_user_id for update;
  if not found then raise exception 'Circle member not found'; end if;
  if v_role = 'organizer' and (select count(*) from public.circle_memberships where circle_id = p_circle_id and role = 'organizer') <= 1 then
    raise exception 'Promote another organizer before removing the last organizer';
  end if;
  delete from public.circle_memberships where circle_id = p_circle_id and user_id = p_user_id;
end;
$$;

create or replace function public.leave_circle(p_circle_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_role public.circle_role;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select role into v_role from public.circle_memberships where circle_id = p_circle_id and user_id = v_user_id for update;
  if not found then raise exception 'You are not a member of this circle'; end if;
  if v_role = 'organizer' and (select count(*) from public.circle_memberships where circle_id = p_circle_id and role = 'organizer') <= 1 then
    raise exception 'Promote another organizer before leaving this circle';
  end if;
  delete from public.circle_memberships where circle_id = p_circle_id and user_id = v_user_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_memberships enable row level security;
alter table public.circle_invites enable row level security;
alter table public.galas enable row level security;
alter table public.rsvps enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_payments enable row level security;
alter table public.gala_albums enable row level security;

drop policy if exists profiles_read_circle_peers on public.profiles;
create policy profiles_read_circle_peers on public.profiles for select to authenticated using (public.can_view_profile(id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists circles_read_members on public.circles;
create policy circles_read_members on public.circles for select to authenticated using (public.is_circle_member(id));
drop policy if exists circles_update_organizers on public.circles;
create policy circles_update_organizers on public.circles for update to authenticated using (public.is_circle_organizer(id)) with check (public.is_circle_organizer(id));

drop policy if exists memberships_read_members on public.circle_memberships;
create policy memberships_read_members on public.circle_memberships for select to authenticated using (public.is_circle_member(circle_id));
-- No client-side membership insert/update/delete policies: use the checked RPCs.
-- Invites also have no direct access policy; hashes stay private to the server.

drop policy if exists galas_read_members on public.galas;
create policy galas_read_members on public.galas for select to authenticated using (public.is_circle_member(circle_id));
drop policy if exists galas_create_organizers on public.galas;
create policy galas_create_organizers on public.galas for insert to authenticated with check (public.is_circle_organizer(circle_id) and created_by = auth.uid());
drop policy if exists galas_update_organizers on public.galas;
create policy galas_update_organizers on public.galas for update to authenticated using (public.is_circle_organizer(circle_id)) with check (public.is_circle_organizer(circle_id));
drop policy if exists galas_delete_organizers on public.galas;
create policy galas_delete_organizers on public.galas for delete to authenticated using (public.is_circle_organizer(circle_id));

drop policy if exists rsvps_read_members on public.rsvps;
create policy rsvps_read_members on public.rsvps for select to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_member(g.circle_id))
);
drop policy if exists rsvps_insert_self on public.rsvps;
create policy rsvps_insert_self on public.rsvps for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_member(g.circle_id))
);
drop policy if exists rsvps_update_self on public.rsvps;
create policy rsvps_update_self on public.rsvps for update to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_member(g.circle_id))
);
drop policy if exists rsvps_delete_self on public.rsvps;
create policy rsvps_delete_self on public.rsvps for delete to authenticated using (user_id = auth.uid());

drop policy if exists expenses_read_members on public.expenses;
create policy expenses_read_members on public.expenses for select to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_member(g.circle_id))
);
drop policy if exists expenses_create_organizers on public.expenses;
create policy expenses_create_organizers on public.expenses for insert to authenticated with check (
  created_by = auth.uid() and exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
);
drop policy if exists expenses_update_organizers on public.expenses;
create policy expenses_update_organizers on public.expenses for update to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
) with check (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
);
drop policy if exists expenses_delete_organizers on public.expenses;
create policy expenses_delete_organizers on public.expenses for delete to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
);

drop policy if exists payments_read_members on public.expense_payments;
create policy payments_read_members on public.expense_payments for select to authenticated using (
  exists (select 1 from public.expenses e join public.galas g on g.id = e.gala_id where e.id = expense_id and public.is_circle_member(g.circle_id))
);
drop policy if exists payments_insert_self_or_organizer on public.expense_payments;
create policy payments_insert_self_or_organizer on public.expense_payments for insert to authenticated with check (
  (user_id = auth.uid() or exists (select 1 from public.expenses e join public.galas g on g.id=e.gala_id where e.id=expense_id and public.is_circle_organizer(g.circle_id)))
  and exists (select 1 from public.expenses e join public.galas g on g.id=e.gala_id where e.id=expense_id and public.is_circle_member(g.circle_id))
);
drop policy if exists payments_update_self_or_organizer on public.expense_payments;
create policy payments_update_self_or_organizer on public.expense_payments for update to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.expenses e join public.galas g on g.id=e.gala_id where e.id=expense_id and public.is_circle_organizer(g.circle_id))
) with check (
  (user_id = auth.uid() or exists (select 1 from public.expenses e join public.galas g on g.id=e.gala_id where e.id=expense_id and public.is_circle_organizer(g.circle_id)))
  and exists (select 1 from public.expenses e join public.galas g on g.id=e.gala_id where e.id=expense_id and public.is_circle_member(g.circle_id))
);
drop policy if exists payments_delete_self_or_organizer on public.expense_payments;
create policy payments_delete_self_or_organizer on public.expense_payments for delete to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.expenses e join public.galas g on g.id=e.gala_id where e.id=expense_id and public.is_circle_organizer(g.circle_id))
);

drop policy if exists albums_read_members on public.gala_albums;
create policy albums_read_members on public.gala_albums for select to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_member(g.circle_id))
);
drop policy if exists albums_create_organizers on public.gala_albums;
create policy albums_create_organizers on public.gala_albums for insert to authenticated with check (
  created_by = auth.uid() and exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
);
drop policy if exists albums_update_organizers on public.gala_albums;
create policy albums_update_organizers on public.gala_albums for update to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
) with check (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
);
drop policy if exists albums_delete_organizers on public.gala_albums;
create policy albums_delete_organizers on public.gala_albums for delete to authenticated using (
  exists (select 1 from public.galas g where g.id = gala_id and public.is_circle_organizer(g.circle_id))
);

-- Explicit API grants work even if automatic grants were disabled at project creation.
grant usage on schema public to authenticated;
revoke all on table public.profiles, public.circles, public.circle_memberships,
  public.circle_invites, public.galas, public.rsvps, public.expenses,
  public.expense_payments, public.gala_albums from anon, public;
grant select, update on public.profiles to authenticated;
grant select, update on public.circles to authenticated;
grant select on public.circle_memberships, public.circle_invites to authenticated;
grant select, insert, update, delete on public.galas, public.rsvps, public.expenses, public.expense_payments, public.gala_albums to authenticated;

revoke all on function public.is_circle_member(uuid) from public, anon;
revoke all on function public.is_circle_organizer(uuid) from public, anon;
revoke all on function public.can_view_profile(uuid) from public, anon;
revoke all on function public.create_circle(text) from public, anon;
revoke all on function public.create_circle_invite(uuid, text, timestamptz, integer) from public, anon;
revoke all on function public.redeem_circle_invite(text) from public, anon;
revoke all on function public.revoke_circle_invite(uuid) from public, anon;
revoke all on function public.set_circle_member_role(uuid, uuid, public.circle_role) from public, anon;
revoke all on function public.remove_circle_member(uuid, uuid) from public, anon;
revoke all on function public.leave_circle(uuid) from public, anon;
grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.is_circle_organizer(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.create_circle(text) to authenticated;
grant execute on function public.create_circle_invite(uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.redeem_circle_invite(text) to authenticated;
grant execute on function public.revoke_circle_invite(uuid) to authenticated;
grant execute on function public.set_circle_member_role(uuid, uuid, public.circle_role) to authenticated;
grant execute on function public.remove_circle_member(uuid, uuid) to authenticated;
grant execute on function public.leave_circle(uuid) to authenticated;

-- Realtime channels enforce the same table RLS as normal API queries.
do $$ declare v_table text;
begin
  foreach v_table in array array['circles','circle_memberships','galas','rsvps','expenses','expense_payments','gala_albums'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;
