-- Profile onboarding and expiring circle join codes.
begin;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
update public.profiles p set onboarding_completed = true
where exists (select 1 from public.circle_memberships cm where cm.user_id = p.id);

create table if not exists public.circle_join_codes (
  circle_id uuid primary key references public.circles(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id)
);
create table if not exists public.circle_code_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.circle_join_codes enable row level security;
alter table public.circle_code_attempts enable row level security;
revoke all on public.circle_join_codes, public.circle_code_attempts from public, anon, authenticated;

create or replace function public.create_circle_join_code(p_circle_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code text; v_expiry timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null or not public.is_circle_organizer(p_circle_id) then
    raise exception 'Only circle organizers can make a join code' using errcode = '42501';
  end if;
  v_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  insert into public.circle_join_codes(circle_id, code_hash, expires_at, created_by)
  values (p_circle_id, encode(extensions.digest(v_code, 'sha256'), 'hex'), v_expiry, auth.uid())
  on conflict (circle_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, created_by = excluded.created_by;
  return jsonb_build_object('code', v_code, 'expires_at', v_expiry);
end;
$$;

create or replace function public.redeem_circle_join_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_attempt public.circle_code_attempts%rowtype; v_circle uuid;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[[:space:]-]', '', 'g'));
begin
  if v_user is null then raise exception 'Sign in before joining a circle' using errcode = '28000'; end if;
  insert into public.circle_code_attempts(user_id) values(v_user) on conflict do nothing;
  select * into v_attempt from public.circle_code_attempts where user_id = v_user for update;
  if v_attempt.window_started < now() - interval '15 minutes' then
    update public.circle_code_attempts set window_started = now(), attempts = 0 where user_id = v_user;
    v_attempt.attempts := 0;
  end if;
  if v_attempt.attempts >= 10 then
    return jsonb_build_object('error', 'Too many tries. Wait 15 minutes and try again.');
  end if;
  update public.circle_code_attempts set attempts = attempts + 1 where user_id = v_user;
  if v_code ~ '^[0-9A-F]{12}$' then
    select circle_id into v_circle from public.circle_join_codes
    where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex') and expires_at > now() for update;
  end if;
  if v_circle is null then return jsonb_build_object('error', 'That code is invalid or expired. Ask an organizer for a new one.'); end if;
  insert into public.circle_memberships(circle_id, user_id, role) values(v_circle, v_user, 'member') on conflict do nothing;
  return jsonb_build_object('circle_id', v_circle);
end;
$$;
revoke all on function public.create_circle_join_code(uuid), public.redeem_circle_join_code(text) from public, anon;
grant execute on function public.create_circle_join_code(uuid), public.redeem_circle_join_code(text) to authenticated;
commit;
