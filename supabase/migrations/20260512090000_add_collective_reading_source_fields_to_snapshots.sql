alter table public.public_transparency_snapshots
  add column if not exists source_type text null,
  add column if not exists source_filters jsonb null,
  add column if not exists source_generated_at timestamptz null;
