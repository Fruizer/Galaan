-- Let any member leave after the app's three-press confirmation. If the
-- departing member is the final organizer, assign the oldest remaining member
-- the circle-management role first so the circle stays manageable.

create or replace function public.leave_circle(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.circle_role;
  v_next_organizer uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform 1
  from public.circles
  where id = p_circle_id
  for update;

  select role
  into v_role
  from public.circle_memberships
  where circle_id = p_circle_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'You are not a member of this circle';
  end if;

  if v_role = 'organizer'
     and (select count(*) from public.circle_memberships where circle_id = p_circle_id and role = 'organizer') <= 1 then
    select user_id
    into v_next_organizer
    from public.circle_memberships
    where circle_id = p_circle_id and user_id <> v_user_id
    order by joined_at, user_id
    limit 1
    for update;

    if v_next_organizer is not null then
      update public.circle_memberships
      set role = 'organizer'
      where circle_id = p_circle_id and user_id = v_next_organizer;
    end if;
  end if;

  delete from public.circle_memberships
  where circle_id = p_circle_id and user_id = v_user_id;
end;
$$;
