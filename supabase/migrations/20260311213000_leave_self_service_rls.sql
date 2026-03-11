-- Align leave self-service with app behavior and narrow member-visible records.

drop policy if exists leave_requests_select_self_or_operator on public.leave_requests;
create policy leave_requests_select_self_or_operator
on public.leave_requests
as restrictive
for select
using (
  requested_by = auth.uid()
  or public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[])
);

drop policy if exists leave_requests_insert_self_or_operator on public.leave_requests;
create policy leave_requests_insert_self_or_operator
on public.leave_requests
for insert
to authenticated
with check (
  public.is_company_member(company_id)
  and (
    requested_by = auth.uid()
    or public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[])
  )
);

drop policy if exists idempotency_requests_select_self_or_operator on public.idempotency_requests;
create policy idempotency_requests_select_self_or_operator
on public.idempotency_requests
as restrictive
for select
using (
  created_by = auth.uid()
  or public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[])
);

drop policy if exists idempotency_requests_insert_self on public.idempotency_requests;
create policy idempotency_requests_insert_self
on public.idempotency_requests
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_company_member(company_id)
);

drop policy if exists idempotency_requests_update_self on public.idempotency_requests;
create policy idempotency_requests_update_self
on public.idempotency_requests
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());
