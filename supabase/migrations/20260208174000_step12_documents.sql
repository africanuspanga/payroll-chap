-- Step 12: Documents and records retention

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null,
  entity_type text,
  entity_id text,
  file_uri text not null,
  storage_bucket text not null default 'documents',
  content_hash text,
  retention_until date,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_documents_company_type_created
  on public.documents (company_id, document_type, created_at desc);

alter table public.documents enable row level security;

create policy documents_select_member
on public.documents
for select
using (public.is_company_member(company_id));

create policy documents_insert_operator
on public.documents
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

create policy documents_update_owner_admin
on public.documents
for update
using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
