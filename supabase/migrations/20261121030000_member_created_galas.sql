-- Every circle member may plan a gala. The gala creator owns changes to its
-- plan, ambagan items, and recap, regardless of their circle role.

begin;

drop policy if exists galas_create_organizers on public.galas;
drop policy if exists galas_update_organizers on public.galas;
drop policy if exists galas_delete_organizers on public.galas;
drop policy if exists galas_create_members on public.galas;
drop policy if exists galas_update_creator on public.galas;
drop policy if exists galas_delete_creator on public.galas;

create policy galas_create_members on public.galas for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_circle_member(circle_id));
create policy galas_update_creator on public.galas for update to authenticated
  using (created_by = (select auth.uid()) and public.is_circle_member(circle_id))
  with check (created_by = (select auth.uid()) and public.is_circle_member(circle_id));
create policy galas_delete_creator on public.galas for delete to authenticated
  using (created_by = (select auth.uid()) and public.is_circle_member(circle_id));

-- RLS checks both old and new rows, but cannot compare them. Prevent an owner
-- from moving an existing gala into another circle with a direct API update.
create or replace function public.keep_gala_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.circle_id is distinct from old.circle_id or new.created_by is distinct from old.created_by then
    raise exception 'A gala cannot change circle or creator' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists galas_keep_scope on public.galas;
create trigger galas_keep_scope before update on public.galas
  for each row execute function public.keep_gala_scope();

-- A member creating a gala may also save its initial shared costs. Only that
-- gala's creator may later add, edit, or remove its ambagan items.
drop policy if exists expenses_create_organizers on public.expenses;
drop policy if exists expenses_update_organizers on public.expenses;
drop policy if exists expenses_delete_organizers on public.expenses;
drop policy if exists expenses_create_gala_creator on public.expenses;
drop policy if exists expenses_update_gala_creator on public.expenses;
drop policy if exists expenses_delete_gala_creator on public.expenses;

create policy expenses_create_gala_creator on public.expenses for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ));
create policy expenses_update_gala_creator on public.expenses for update to authenticated
  using (exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ))
  with check (exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ));
create policy expenses_delete_gala_creator on public.expenses for delete to authenticated
  using (exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ));

create or replace function public.keep_expense_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.gala_id is distinct from old.gala_id or new.created_by is distinct from old.created_by then
    raise exception 'An expense cannot change gala or creator' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists expenses_keep_scope on public.expenses;
create trigger expenses_keep_scope before update on public.expenses
  for each row execute function public.keep_expense_scope();

-- The recap note lives on galas. Give its album links the same creator rule.
drop policy if exists albums_create_organizers on public.gala_albums;
drop policy if exists albums_update_organizers on public.gala_albums;
drop policy if exists albums_delete_organizers on public.gala_albums;
drop policy if exists albums_create_gala_creator on public.gala_albums;
drop policy if exists albums_update_gala_creator on public.gala_albums;
drop policy if exists albums_delete_gala_creator on public.gala_albums;

create policy albums_create_gala_creator on public.gala_albums for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ));
create policy albums_update_gala_creator on public.gala_albums for update to authenticated
  using (exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ))
  with check (exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ));
create policy albums_delete_gala_creator on public.gala_albums for delete to authenticated
  using (exists (
    select 1 from public.galas g where g.id = gala_id
      and g.created_by = (select auth.uid()) and public.is_circle_member(g.circle_id)
  ));

create or replace function public.keep_album_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.gala_id is distinct from old.gala_id or new.created_by is distinct from old.created_by then
    raise exception 'An album link cannot change gala or creator' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists albums_keep_scope on public.gala_albums;
create trigger albums_keep_scope before update on public.gala_albums
  for each row execute function public.keep_album_scope();

-- Attendees mark their own payments. The gala creator and circle organizers
-- may also record another attendee's payment, but never for an outsider.
create or replace function public.can_change_expense_payment(p_expense_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.expenses e
    join public.galas g on g.id = e.gala_id
    join public.circle_memberships actor on actor.circle_id = g.circle_id and actor.user_id = auth.uid()
    join public.circle_memberships attendee on attendee.circle_id = g.circle_id and attendee.user_id = p_user_id
    where e.id = p_expense_id
      and (p_user_id = auth.uid() or g.created_by = auth.uid() or actor.role = 'organizer'::public.circle_role)
  );
$$;

drop policy if exists payments_insert_self_or_organizer on public.expense_payments;
drop policy if exists payments_update_self_or_organizer on public.expense_payments;
drop policy if exists payments_delete_self_or_organizer on public.expense_payments;
drop policy if exists payments_insert_attendee_or_manager on public.expense_payments;
drop policy if exists payments_update_attendee_or_manager on public.expense_payments;
drop policy if exists payments_delete_attendee_or_manager on public.expense_payments;
create policy payments_insert_attendee_or_manager on public.expense_payments for insert to authenticated
  with check (public.can_change_expense_payment(expense_id, user_id));
create policy payments_update_attendee_or_manager on public.expense_payments for update to authenticated
  using (public.can_change_expense_payment(expense_id, user_id))
  with check (public.can_change_expense_payment(expense_id, user_id));
create policy payments_delete_attendee_or_manager on public.expense_payments for delete to authenticated
  using (public.can_change_expense_payment(expense_id, user_id));

create or replace function public.keep_payment_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.expense_id is distinct from old.expense_id or new.user_id is distinct from old.user_id then
    raise exception 'A payment cannot change expense or attendee' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists payments_keep_scope on public.expense_payments;
create trigger payments_keep_scope before update on public.expense_payments
  for each row execute function public.keep_payment_scope();

revoke all on function public.keep_gala_scope() from public, anon;
revoke all on function public.keep_expense_scope() from public, anon;
revoke all on function public.keep_album_scope() from public, anon;
revoke all on function public.keep_payment_scope() from public, anon;
revoke all on function public.can_change_expense_payment(uuid, uuid) from public, anon;
grant execute on function public.can_change_expense_payment(uuid, uuid) to authenticated;

commit;
