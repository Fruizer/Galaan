-- Publish profile edits so circle members receive avatar/name changes live.
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
