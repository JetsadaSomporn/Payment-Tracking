-- 006: Row-level HMAC signatures for tamper-evident transactions
-- Protects against rogue DB admin: row-swap, direct DB edits
alter table transactions
add column if not exists row_signature text;

-- Backfill signatures for existing rows (HMAC is computed app-side, so no SQL backfill needed)
-- New inserts will have signature populated; existing rows without signature
-- will be treated as legacy and pass verification silently.

comment on column transactions.row_signature is
'HMAC-SHA256(row_id + user_id + amount + fee + type + transaction_date + title + bank_name + receiver_name + reference_no). Verified on every read. Null = legacy row before HMAC was enabled.';
