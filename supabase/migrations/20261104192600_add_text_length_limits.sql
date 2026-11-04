BEGIN;

ALTER TABLE public.groups
  DROP CONSTRAINT read_token_length,
  DROP CONSTRAINT write_token_length,
  ADD CONSTRAINT groups_name_length
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  ADD CONSTRAINT read_token_length
    CHECK (char_length(read_token) BETWEEN 32 AND 128),
  ADD CONSTRAINT write_token_length
    CHECK (char_length(write_token) BETWEEN 32 AND 128);

ALTER TABLE public.members
  ADD CONSTRAINT members_name_length
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 100);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_description_length
    CHECK (char_length(btrim(description)) BETWEEN 1 AND 1000);

COMMIT;