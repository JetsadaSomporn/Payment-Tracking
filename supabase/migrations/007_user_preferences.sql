-- 007: User preferences for settings persisted in DB
-- Enables real settings: AI model, confidence threshold, auto-categorize, reduced motion

alter table profiles
add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column profiles.preferences is
'User-configurable settings persisted across sessions. Keys: aiModel, aiConfidence, autoCategorize, reducedMotion. Example: {"aiModel": "deepseek-v4-flash", "aiConfidence": 0.75, "autoCategorize": true, "reducedMotion": false}';

-- Update handle_new_user to include default preferences
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url, preferences)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    '{"aiModel": "deepseek-v4-flash", "aiConfidence": 0.75, "autoCategorize": true, "reducedMotion": false}'::jsonb
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;
