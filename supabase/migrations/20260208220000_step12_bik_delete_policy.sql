-- Allow authorized company operators to remove obsolete BIK rows

drop policy if exists employee_benefits_in_kind_delete_operator on public.employee_benefits_in_kind;
create policy employee_benefits_in_kind_delete_operator
on public.employee_benefits_in_kind
for delete
using (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));
