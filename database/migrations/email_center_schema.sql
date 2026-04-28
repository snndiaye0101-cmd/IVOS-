-- =====================================================
-- EMAIL CENTER SCHEMA
-- OAuth accounts, message linking and sync telemetry for IVOS
-- =====================================================

create extension if not exists pgcrypto;

create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null check (provider in ('gmail', 'outlook')),
  email_address text not null,
  display_name text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_accounts_user_provider_email_idx
  on public.email_accounts (user_id, provider, email_address);

create table if not exists public.email_links (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider_message_id text not null,
  account_id text not null,
  email_subject text not null,
  target_type text not null check (target_type in ('vehicle', 'mission')),
  target_id text not null,
  target_label text not null,
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists email_links_unique_idx
  on public.email_links (user_id, provider_message_id, target_type, target_id);

create table if not exists public.email_sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  account_id text not null,
  provider text not null,
  sync_started_at timestamptz not null default now(),
  sync_finished_at timestamptz,
  status text not null default 'running',
  details jsonb not null default '{}'::jsonb
);

-- Trigger for updated_at on email_accounts
create or replace function public.set_email_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_accounts_updated_at on public.email_accounts;

create trigger trg_email_accounts_updated_at
before update on public.email_accounts
for each row
execute function public.set_email_accounts_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

alter table public.email_accounts enable row level security;
alter table public.email_links enable row level security;
alter table public.email_sync_logs enable row level security;

drop policy if exists email_accounts_select_own on public.email_accounts;
drop policy if exists email_accounts_insert_own on public.email_accounts;
drop policy if exists email_accounts_update_own on public.email_accounts;
drop policy if exists email_accounts_delete_own on public.email_accounts;

create policy email_accounts_select_own
  on public.email_accounts
  for select
  using (auth.uid()::text = user_id);

create policy email_accounts_insert_own
  on public.email_accounts
  for insert
  with check (auth.uid()::text = user_id);

create policy email_accounts_update_own
  on public.email_accounts
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy email_accounts_delete_own
  on public.email_accounts
  for delete
  using (auth.uid()::text = user_id);

drop policy if exists email_links_select_own on public.email_links;
drop policy if exists email_links_insert_own on public.email_links;
drop policy if exists email_links_update_own on public.email_links;
drop policy if exists email_links_delete_own on public.email_links;

create policy email_links_select_own
  on public.email_links
  for select
  using (auth.uid()::text = user_id);

create policy email_links_insert_own
  on public.email_links
  for insert
  with check (auth.uid()::text = user_id);

create policy email_links_update_own
  on public.email_links
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy email_links_delete_own
  on public.email_links
  for delete
  using (auth.uid()::text = user_id);

drop policy if exists email_sync_logs_select_own on public.email_sync_logs;
drop policy if exists email_sync_logs_insert_own on public.email_sync_logs;
drop policy if exists email_sync_logs_update_own on public.email_sync_logs;
drop policy if exists email_sync_logs_delete_own on public.email_sync_logs;

create policy email_sync_logs_select_own
  on public.email_sync_logs
  for select
  using (auth.uid()::text = user_id);

create policy email_sync_logs_insert_own
  on public.email_sync_logs
  for insert
  with check (auth.uid()::text = user_id);

create policy email_sync_logs_update_own
  on public.email_sync_logs
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy email_sync_logs_delete_own
  on public.email_sync_logs
  for delete
  using (auth.uid()::text = user_id);
