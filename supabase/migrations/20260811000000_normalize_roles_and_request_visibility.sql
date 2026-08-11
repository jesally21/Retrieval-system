create or replace function public.normalize_role_text(role text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(trim(coalesce(role, ''))) = 'sacd_head' then 'department_head'
    when lower(trim(coalesce(role, ''))) = 'admin' then 'superadmin'
    when lower(trim(coalesce(role, ''))) in ('staff/requestor', 'staff-requestor', 'staff requestor', 'requestor', 'staff', 'staff / requestor') then 'requestor'
    when lower(trim(coalesce(role, ''))) in ('branch head', 'branch-head', 'branch/head', 'branch head approver', 'manager - approver of requestor', 'manager / approver of requestor') then 'branch_head'
    when lower(trim(coalesce(role, ''))) in ('department head', 'department-head', 'department/head', 'head - approver of requestors and managers', 'head / approver of requestors and managers') then 'department_head'
    when lower(trim(coalesce(role, ''))) in ('admin/dpo', 'admin - dpo', 'data privacy officer', 'dpo') then 'dpo'
    when lower(trim(coalesce(role, ''))) in ('admin/ceo', 'admin - ceo', 'ceo') then 'ceo'
    when lower(trim(coalesce(role, ''))) in ('archivist', 'archivist - process approved docs') then 'archivist'
    when lower(trim(coalesce(role, ''))) in ('superadmin', 'super admin', 'superadmin / ict', 'super admin / ict', 'super admin - ict', 'ict') then 'superadmin'
    when lower(trim(coalesce(role, ''))) in ('requestor', 'branch_head', 'department_head', 'dpo', 'ceo', 'archivist', 'superadmin') then lower(trim(role))
    else 'requestor'
  end
$$;

update public.profiles
set role = public.normalize_role_text(role)
where role is distinct from public.normalize_role_text(role);

create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.normalize_role_text(role)
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := public.normalize_role_text(coalesce(
    nullif(trim(metadata->>'role'), ''),
    nullif(trim(coalesce(new.raw_app_meta_data, '{}'::jsonb)->>'role'), ''),
    'requestor'
  ));
  requested_status text := coalesce(nullif(trim(metadata->>'status'), ''), 'Active');
  requested_created_by uuid := null;
begin
  if requested_status not in ('Active', 'Inactive') then
    requested_status := 'Active';
  end if;

  begin
    if nullif(trim(metadata->>'created_by'), '') is not null
      and lower(trim(metadata->>'created_by')) <> 'null'
      and trim(metadata->>'created_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and exists (
        select 1
        from public.profiles
        where id = trim(metadata->>'created_by')::uuid
      )
    then
      requested_created_by := trim(metadata->>'created_by')::uuid;
    end if;
  exception
    when others then
      requested_created_by := null;
  end;

  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    branch,
    department,
    position,
    created_by,
    created_by_name,
    status,
    role,
    is_active
  )
  values (
    new.id,
    coalesce(nullif(trim(metadata->>'full_name'), ''), new.email, 'User'),
    coalesce(new.email, ''),
    nullif(trim(metadata->>'avatar_url'), ''),
    nullif(trim(metadata->>'branch'), ''),
    nullif(trim(metadata->>'department'), ''),
    nullif(trim(metadata->>'position'), ''),
    requested_created_by,
    nullif(trim(metadata->>'created_by_name'), ''),
    requested_status,
    requested_role,
    requested_status = 'Active'
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    branch = excluded.branch,
    department = excluded.department,
    position = coalesce(excluded.position, public.profiles.position),
    created_by = excluded.created_by,
    created_by_name = excluded.created_by_name,
    status = excluded.status,
    role = coalesce(public.normalize_role_text(excluded.role), public.profiles.role),
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
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
        or (public.normalize_role_text(p.role) = 'branch_head' and p.branch = dr.branch)
      )
  )
$$;

drop policy if exists "request visibility by ownership routing and role" on public.document_requests;
create policy "request visibility by ownership routing and role" on public.document_requests for select using (
  requestor_id = auth.uid()
  or current_approver_id = auth.uid()
  or assigned_archivist_id = auth.uid()
  or public.is_executive_or_privacy()
  or public.is_superadmin()
  or public.is_archivist()
  or exists (
    select 1
    from public.approval_actions aa
    where aa.request_id = document_requests.id
      and aa.approver_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and public.normalize_role_text(p.role) = 'branch_head'
      and p.branch = document_requests.branch
  )
);
