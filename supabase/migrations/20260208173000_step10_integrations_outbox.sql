-- Integration hooks for future email/SMS/WhatsApp delivery

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_status' and typnamespace = 'public'::regnamespace) then
    create type public.notification_status as enum ('queued', 'processing', 'sent', 'failed', 'cancelled');
  end if;
end;
$$;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel text not null,
  template_code text not null,
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  provider_message_id text,
  error_message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notification_outbox_company_status
  on public.notification_outbox (company_id, status, created_at);

alter table public.notification_outbox enable row level security;

create policy notification_outbox_select_member
on public.notification_outbox
for select
using (public.is_company_member(company_id));

create policy notification_outbox_insert_operator
on public.notification_outbox
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

create policy notification_outbox_update_operator
on public.notification_outbox
for update
using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
