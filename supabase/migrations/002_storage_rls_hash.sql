-- Replace storage folder path from raw user UUID to hashed path
-- Prevents user UUID enumeration via storage URL patterns

create or replace function public.hash_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

do $$
begin
  execute format(
    'drop policy if exists "users can read own slip files" on storage.objects'
  );
  execute format(
    'drop policy if exists "users can upload own slip files" on storage.objects'
  );
  execute format(
    'drop policy if exists "users can update own slip files" on storage.objects'
  );
  execute format(
    'drop policy if exists "users can delete own slip files" on storage.objects'
  );
end $$;

create policy "users can read own slip files"
on storage.objects for select
using (
  bucket_id = 'slips'
  and md5(auth.uid()::text) = (storage.foldername(name))[1]
);

create policy "users can upload own slip files"
on storage.objects for insert
with check (
  bucket_id = 'slips'
  and md5(auth.uid()::text) = (storage.foldername(name))[1]
);

create policy "users can update own slip files"
on storage.objects for update
using (
  bucket_id = 'slips'
  and md5(auth.uid()::text) = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'slips'
  and md5(auth.uid()::text) = (storage.foldername(name))[1]
);

create policy "users can delete own slip files"
on storage.objects for delete
using (
  bucket_id = 'slips'
  and md5(auth.uid()::text) = (storage.foldername(name))[1]
);
