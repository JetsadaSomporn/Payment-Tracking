-- Fix check constraints for encrypted fields
-- AES-256-GCM encryption expands text significantly (IV + authTag + ciphertext in hex)
-- Encrypted length ≈ 90 + (input_length * 2) — need much larger constraints

alter table transactions
  drop constraint if exists transactions_reference_no_check,
  add constraint transactions_reference_no_check
    check (char_length(reference_no) <= 256);

alter table transactions
  drop constraint if exists transactions_title_check,
  add constraint transactions_title_check
    check (char_length(title) <= 384);

alter table transactions
  drop constraint if exists transactions_bank_name_check,
  add constraint transactions_bank_name_check
    check (char_length(bank_name) <= 256);

alter table transactions
  drop constraint if exists transactions_receiver_name_check,
  add constraint transactions_receiver_name_check
    check (char_length(receiver_name) <= 384);
