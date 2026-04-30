alter table public.listening_records
add column if not exists territorial_review_status text not null default 'pending'
  check (territorial_review_status in ('pending', 'reviewed', 'needs_attention')),
add column if not exists territorial_review_notes text;

create index if not exists listening_records_territorial_review_status_idx
on public.listening_records (territorial_review_status);
