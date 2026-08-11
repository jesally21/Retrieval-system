create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.get_my_role() = 'superadmin', false)
$$;

create or replace function public.can_view_request(target_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.document_requests dr
    left join public.profiles p on p.id = auth.uid()
    where dr.id = target_request_id
      and (
        dr.requestor_id = auth.uid()
        or dr.current_approver_id = auth.uid()
        or exists (
          select 1
          from public.approval_actions aa
          where aa.request_id = dr.id
            and aa.approver_id = auth.uid()
        )
        or dr.assigned_archivist_id = auth.uid()
        or public.is_archivist()
        or public.is_executive_or_privacy()
        or public.is_superadmin()
        or (p.role = 'branch_head' and p.branch = dr.branch)
      )
  )
$$;

drop policy if exists "archivist processing visible to authorized users" on public.archivist_processing;
create policy "archivist processing visible to authorized users" on public.archivist_processing for select using (public.can_view_request(request_id) or public.is_archivist() or public.is_superadmin());

drop policy if exists "archivists manage processing" on public.archivist_processing;
create policy "archivists manage processing" on public.archivist_processing for all using (public.is_archivist() or public.is_superadmin()) with check (public.is_archivist() or public.is_superadmin());

drop policy if exists "closures visible to authorized users" on public.request_closures;
create policy "closures visible to authorized users" on public.request_closures for select using (public.can_view_request(request_id) or public.is_archivist() or public.is_superadmin());

drop policy if exists "archivists manage closures" on public.request_closures;
create policy "archivists manage closures" on public.request_closures for all using (public.is_archivist() or public.is_superadmin()) with check (public.is_archivist() or public.is_superadmin());

drop policy if exists "incident visibility" on public.incident_reports;
create policy "incident visibility" on public.incident_reports for select using (
  public.is_superadmin()
  or public.get_my_role() in ('archivist', 'dpo', 'ceo')
  or public.can_view_request(request_id)
);

drop policy if exists "authorized users create incidents" on public.incident_reports;
create policy "authorized users create incidents" on public.incident_reports for insert with check (
  public.is_superadmin()
  or public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo')
);

drop policy if exists "admins archivists update incidents" on public.incident_reports;
create policy "admins archivists update incidents" on public.incident_reports for update using (
  public.is_superadmin()
  or public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo')
) with check (
  public.is_superadmin()
  or public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo')
);
