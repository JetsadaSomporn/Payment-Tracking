alter table transactions
add column if not exists reference_no_hash text;

drop index if exists transactions_user_reference_unique;

create unique index if not exists transactions_user_reference_hash_unique
on transactions (user_id, reference_no_hash)
where reference_no_hash is not null;
