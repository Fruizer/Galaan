-- Private, size-bounded profile avatars. Store only an object path on profiles;
-- circle members receive short-lived signed URLs from Storage.

begin;

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (
    avatar_url is null
    or (
      char_length(avatar_url) <= 2048
      and (
        avatar_url ~ '^https://'
        or avatar_url ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar[.]webp$'
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 524288, array['image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 524288,
    allowed_mime_types = array['image/webp'];

drop policy if exists "Circle members can view profile avatars" on storage.objects;
create policy "Circle members can view profile avatars"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.circle_memberships mine
      join public.circle_memberships theirs on theirs.circle_id = mine.circle_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "Users can upload their own profile avatar" on storage.objects;
create policy "Users can upload their own profile avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar.webp'
);

drop policy if exists "Users can update their own profile avatar" on storage.objects;
create policy "Users can update their own profile avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar.webp'
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar.webp'
);

drop policy if exists "Users can delete their own profile avatar" on storage.objects;
create policy "Users can delete their own profile avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar.webp'
);

-- Profile updates need to reach other signed-in members without a reload.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end;
$$;

commit;
