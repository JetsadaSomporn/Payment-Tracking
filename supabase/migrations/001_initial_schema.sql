create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  email text,
  avatar_url text,
  default_currency text not null default 'THB',
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) <= 60),
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create table slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  image_hash text,
  ocr_provider text not null default 'mock',
  ocr_model text not null default 'mock-slip-extractor',
  ocr_status text not null default 'pending'
    check (ocr_status in ('pending', 'processing', 'success', 'failed', 'needs_review')),
  raw_ocr_text text,
  extracted_json jsonb,
  confidence numeric(4,3),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (user_id, image_hash)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slip_id uuid references slips(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(12,2) not null check (amount > 0),
  fee numeric(12,2) not null default 0 check (fee >= 0),
  currency text not null default 'THB',
  title text not null check (char_length(title) <= 120),
  note text check (char_length(note) <= 1000),
  merchant_name text check (char_length(merchant_name) <= 120),
  sender_name text check (char_length(sender_name) <= 120),
  receiver_name text check (char_length(receiver_name) <= 120),
  bank_name text check (char_length(bank_name) <= 80),
  reference_no text check (char_length(reference_no) <= 80),
  transaction_date date not null,
  transaction_time time,
  source text not null default 'slip' check (source in ('slip', 'manual', 'import', 'recurring')),
  status text not null default 'confirmed' check (status in ('draft', 'confirmed', 'rejected')),
  ai_category text,
  ai_confidence numeric(4,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index transactions_user_reference_unique
on transactions (user_id, reference_no)
where reference_no is not null;

create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  summary_date date not null,
  total_income numeric(12,2) not null default 0,
  total_expense numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  category_breakdown jsonb not null default '[]',
  top_transactions jsonb not null default '[]',
  ai_summary text,
  ai_insights jsonb,
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  model_provider text not null default 'local',
  model_name text not null default 'local-summary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summary_date)
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pattern text not null check (char_length(pattern) <= 120),
  category_id uuid references categories(id) on delete cascade,
  default_title text check (char_length(default_title) <= 120),
  created_at timestamptz not null default now()
);

create table ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task text not null,
  provider text not null,
  model text,
  input_hash text,
  input_preview text,
  output_json jsonb,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table slips enable row level security;
alter table transactions enable row level security;
alter table daily_summaries enable row level security;
alter table budgets enable row level security;
alter table merchant_rules enable row level security;
alter table ai_logs enable row level security;

create policy "users can read own profile" on profiles for select using (auth.uid() = id);
create policy "users can update own profile" on profiles for update using (auth.uid() = id);
create policy "users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "users can manage own categories" on categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own slips" on slips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own daily summaries" on daily_summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own budgets" on budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own merchant rules" on merchant_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can read own ai logs" on ai_logs for select using (auth.uid() = user_id);
create policy "users can insert own ai logs" on ai_logs for insert with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'slips',
  'slips',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users can read own slip files"
on storage.objects for select
using (
  bucket_id = 'slips'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "users can upload own slip files"
on storage.objects for insert
with check (
  bucket_id = 'slips'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "users can update own slip files"
on storage.objects for update
using (
  bucket_id = 'slips'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'slips'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "users can delete own slip files"
on storage.objects for delete
using (
  bucket_id = 'slips'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
