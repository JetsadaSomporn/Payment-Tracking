-- Database-backed rate limiting for serverless environments
-- Replaces the in-memory Map which resets per cold-start on Vercel

create table if not exists rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

create index if not exists idx_rate_limits_reset_at on rate_limits (reset_at);

create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_reset_at timestamptz;
begin
  select count, reset_at into v_count, v_reset_at
  from rate_limits
  where key = p_key;

  if v_reset_at is null or v_reset_at <= now() then
    insert into rate_limits (key, count, reset_at)
    values (p_key, 1, now() + (p_window_ms || ' milliseconds')::interval)
    on conflict (key) do update
    set count = 1, reset_at = now() + (p_window_ms || ' milliseconds')::interval;
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update rate_limits
  set count = count + 1
  where key = p_key;

  return true;
end;
$$;

-- Cleanup expired entries periodically
create or replace function public.cleanup_rate_limits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from rate_limits where reset_at <= now();
end;
$$;
