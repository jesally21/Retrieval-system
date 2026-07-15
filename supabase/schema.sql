create extension if not exists "pgcrypto";

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  branch text,
  department text,
  position text,
  role text not null check (
    role in (
      'requestor',
      'branch_head',
      'sacd_head',
      'department_head',
      'dpo',
      'ceo',
      'archivist',
      'admin'
    )
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_routes (
  id uuid primary key default gen_random_uuid(),
  route_name text not null unique,
  branch text,
  department text,
  confidentiality_level text check (confidentiality_level in ('Normal', 'Confidential', 'Highly Sensitive')),
  requester_role text check (requester_role in ('requestor', 'branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin')),
  approver_role text not null check (approver_role in ('branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'admin')),
  step_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  requestor_id uuid not null references public.profiles(id),
  request_date date not null default current_date,
  document_title text not null,
  document_reference_no text,
  document_category_id uuid references public.document_categories(id),
  document_type text not null check (document_type in ('Physical', 'Electronic')),
  confidentiality_level text not null default 'Normal' check (confidentiality_level in ('Normal', 'Confidential', 'Highly Sensitive')),
  purpose text not null,
  date_needed date not null,
  borrow_return_due_date date not null,
  remarks text,
  branch text,
  department text,
  position text,
  status text not null default 'Pending Approval' check (
    status in (
      'Draft',
      'Pending Approval',
      'Needs Clarification',
      'Rejected',
      'Approved',
      'Forwarded to Archivist',
      'Processing',
      'Released',
      'Returned',
      'Access Revoked',
      'Deletion Confirmed',
      'For Closure',
      'Closed',
      'Incident Reported',
      'Overdue',
      'Withdrawn'
    )
  ),
  current_approver_id uuid references public.profiles(id),
  branch_head_requested_by uuid references public.profiles(id),
  branch_head_requested_at timestamptz,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  approval_remarks text,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  clarification_remarks text,
  forwarded_to_archivist_at timestamptz,
  assigned_archivist_id uuid references public.profiles(id),
  agreement_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  approver_id uuid not null references public.profiles(id),
  action text not null check (action in ('Submitted', 'Endorsed', 'Approved', 'Rejected', 'Needs Clarification', 'Forwarded', 'Withdrawn')),
  old_status text,
  new_status text,
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.archivist_processing (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.document_requests(id) on delete cascade,
  archivist_id uuid references public.profiles(id),
  date_received date,
  date_released date,
  borrower_name text,
  expected_return_date date,
  physical_condition_before_release text check (physical_condition_before_release in ('Good Condition', 'With Existing Damage', 'With Missing Pages', 'With Markings', 'Other')),
  storage_location text,
  electronic_release_method text check (electronic_release_method in ('Email', 'Shared Drive', 'Shared Link', 'Cloud Platform', 'Other')),
  electronic_release_reference text,
  access_expiry_date date,
  access_revoked boolean not null default false,
  deletion_confirmation_required boolean not null default false,
  release_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_closures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.document_requests(id) on delete cascade,
  date_returned date,
  condition_upon_return text check (condition_upon_return in ('Complete', 'With Damage', 'With Markings', 'Missing Pages', 'Other')),
  is_complete boolean not null default false,
  has_damage boolean not null default false,
  has_markings boolean not null default false,
  missing_pages boolean not null default false,
  refiled_location text,
  access_revoked boolean not null default false,
  deletion_confirmed boolean not null default false,
  validated_by uuid references public.profiles(id),
  validation_date date,
  closure_remarks text,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  incident_type text not null check (incident_type in ('Lost', 'Missing', 'Damaged', 'Altered', 'Unauthorized Sharing', 'Overdue', 'Access Not Revoked', 'Other')),
  incident_description text not null,
  action_taken text,
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Resolved', 'Closed')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  attachment_type text not null default 'supporting_document' check (attachment_type in ('supporting_document', 'released_file', 'return_evidence', 'incident_evidence')),
  file_name text not null,
  bucket_id text not null default 'documents',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.document_requests(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,
  old_status text,
  new_status text,
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_request_no()
returns text
language plpgsql
as $$
declare
  today_key text := to_char(current_date, 'YYYYMMDD');
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('document_requests:' || today_key));

  select coalesce(max((right(request_no, 4))::integer), 0) + 1
    into next_number
    from public.document_requests
    where request_no like 'DRR-' || today_key || '-%';

  return 'DRR-' || today_key || '-' || lpad(next_number::text, 4, '0');
end;
$$;

create or replace function public.set_document_request_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.request_no is null or length(trim(new.request_no)) = 0 then
    new.request_no = public.generate_request_no();
  end if;

  return new;
end;
$$;

create or replace function public.log_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (request_id, user_id, action, old_status, new_status, remarks)
    values (new.id, new.requestor_id, 'Created request', null, new.status, new.remarks);
  elsif old.status is distinct from new.status then
    insert into public.audit_logs (request_id, user_id, action, old_status, new_status, remarks)
    values (new.id, auth.uid(), 'Status changed', old.status, new.status, null);
  end if;

  return new;
end;
$$;

create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.get_my_role() = 'admin', false)
$$;

create or replace function public.is_archivist()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.get_my_role() = 'archivist', false)
$$;

create or replace function public.is_executive_or_privacy()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.get_my_role() in ('admin', 'ceo', 'dpo'), false)
$$;

create or replace function public.can_approve_request(target_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.document_requests
    where id = target_request_id
      and current_approver_id = auth.uid()
  ) or public.is_admin()
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
        or dr.assigned_archivist_id = auth.uid()
        or public.is_executive_or_privacy()
        or public.is_admin()
        or (p.role = 'branch_head' and p.branch = dr.branch)
      )
  )
$$;

drop trigger if exists set_updated_at_branches on public.branches;
create trigger set_updated_at_branches before update on public.branches for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_departments on public.departments;
create trigger set_updated_at_departments before update on public.departments for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_document_categories on public.document_categories;
create trigger set_updated_at_document_categories before update on public.document_categories for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_approval_routes on public.approval_routes;
create trigger set_updated_at_approval_routes before update on public.approval_routes for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_document_requests on public.document_requests;
create trigger set_updated_at_document_requests before update on public.document_requests for each row execute function public.set_updated_at();
drop trigger if exists set_document_request_defaults on public.document_requests;
create trigger set_document_request_defaults before insert on public.document_requests for each row execute function public.set_document_request_defaults();
drop trigger if exists log_request_status_change on public.document_requests;
create trigger log_request_status_change after insert or update on public.document_requests for each row execute function public.log_request_status_change();
drop trigger if exists set_updated_at_archivist_processing on public.archivist_processing;
create trigger set_updated_at_archivist_processing before update on public.archivist_processing for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_request_closures on public.request_closures;
create trigger set_updated_at_request_closures before update on public.request_closures for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_incident_reports on public.incident_reports;
create trigger set_updated_at_incident_reports before update on public.incident_reports for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_system_settings on public.system_settings;
create trigger set_updated_at_system_settings before update on public.system_settings for each row execute function public.set_updated_at();

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_branch_idx on public.profiles(branch);
create index if not exists document_requests_requestor_idx on public.document_requests(requestor_id);
create index if not exists document_requests_status_idx on public.document_requests(status);
create index if not exists document_requests_current_approver_idx on public.document_requests(current_approver_id);
create index if not exists document_requests_assigned_archivist_idx on public.document_requests(assigned_archivist_id);
create index if not exists document_requests_request_date_idx on public.document_requests(request_date);
create index if not exists approval_actions_request_idx on public.approval_actions(request_id);
create index if not exists archivist_processing_request_idx on public.archivist_processing(request_id);
create index if not exists request_closures_request_idx on public.request_closures(request_id);
create index if not exists incident_reports_request_idx on public.incident_reports(request_id);
create index if not exists incident_reports_status_idx on public.incident_reports(status);
create index if not exists request_attachments_request_idx on public.request_attachments(request_id);
create index if not exists audit_logs_request_idx on public.audit_logs(request_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

insert into public.branches (name) values
  ('Head Office'), ('Barbaza'), ('San Jose'), ('Hamtic'), ('Sibalom'), ('Laua-an'), ('San Remigio')
on conflict (name) do nothing;

insert into public.departments (name) values
  ('ICT Department'), ('HRAD'), ('Accounting'), ('Audit'), ('SACD'), ('Lending'), ('Savings'), ('Broadband Division'), ('Records / Archive'), ('Branch Operations'), ('Compliance'), ('Executive')
on conflict (name) do nothing;

insert into public.document_categories (name, description) values
  ('Member Records', 'Member profile and account documents'),
  ('Finance Records', 'Accounting, ledger, payroll, and reconciliation documents'),
  ('HR Records', 'Employee and personnel documents'),
  ('Board Records', 'Board resolutions, minutes, and corporate records'),
  ('Compliance Records', 'KYC, privacy, legal, audit, and regulatory documents'),
  ('ICT Records', 'ICT asset, warranty, procurement, and system records')
on conflict (name) do nothing;

insert into public.approval_routes (route_name, branch, confidentiality_level, requester_role, approver_role, step_order) values
  ('Branch normal request to branch head', null, 'Normal', 'requestor', 'branch_head', 1),
  ('Branch head endorsement to SACD', null, 'Normal', 'branch_head', 'sacd_head', 1),
  ('Head office normal request to department head', 'Head Office', 'Normal', 'requestor', 'department_head', 1),
  ('Confidential request to DPO', null, 'Confidential', null, 'dpo', 1),
  ('Highly sensitive request to DPO', null, 'Highly Sensitive', null, 'dpo', 1)
on conflict (route_name) do nothing;

insert into public.system_settings (key, value, description) values
  ('request_number_prefix', '"DRR"'::jsonb, 'Prefix used for generated document retrieval request numbers.'),
  ('default_borrow_days', '3'::jsonb, 'Default number of days before physical documents should be returned.'),
  ('documents_storage_bucket', '"documents"'::jsonb, 'Supabase Storage bucket used for request attachments and released files.')
on conflict (key) do nothing;

alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.document_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.approval_routes enable row level security;
alter table public.document_requests enable row level security;
alter table public.approval_actions enable row level security;
alter table public.archivist_processing enable row level security;
alter table public.request_closures enable row level security;
alter table public.incident_reports enable row level security;
alter table public.request_attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "reference data readable branches" on public.branches;
create policy "reference data readable branches" on public.branches for select using (true);
drop policy if exists "reference data admin managed branches" on public.branches;
create policy "reference data admin managed branches" on public.branches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reference data readable departments" on public.departments;
create policy "reference data readable departments" on public.departments for select using (true);
drop policy if exists "reference data admin managed departments" on public.departments;
create policy "reference data admin managed departments" on public.departments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reference data readable categories" on public.document_categories;
create policy "reference data readable categories" on public.document_categories for select using (true);
drop policy if exists "reference data admin managed categories" on public.document_categories;
create policy "reference data admin managed categories" on public.document_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles readable by self and admins" on public.profiles;
create policy "profiles readable by self and admins" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update self basic info" on public.profiles;
create policy "profiles update self basic info" on public.profiles for update using (id = auth.uid()) with check (
  id = auth.uid()
  and role = public.get_my_role()
  and is_active = true
);
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "approval routes readable" on public.approval_routes;
create policy "approval routes readable" on public.approval_routes for select using (auth.role() = 'authenticated');
drop policy if exists "approval routes admin managed" on public.approval_routes;
create policy "approval routes admin managed" on public.approval_routes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "requestors create own requests" on public.document_requests;
create policy "requestors create own requests" on public.document_requests for insert with check (requestor_id = auth.uid());
drop policy if exists "request visibility by ownership routing and role" on public.document_requests;
create policy "request visibility by ownership routing and role" on public.document_requests for select using (public.can_view_request(id));
drop policy if exists "requestors update editable own requests" on public.document_requests;
create policy "requestors update editable own requests" on public.document_requests for update using (
  requestor_id = auth.uid() and status in ('Draft', 'Needs Clarification', 'Pending Approval')
) with check (requestor_id = auth.uid());
drop policy if exists "approvers update routed requests" on public.document_requests;
create policy "approvers update routed requests" on public.document_requests for update using (public.can_approve_request(id)) with check (public.can_approve_request(id));
drop policy if exists "archivists update assigned or forwarded requests" on public.document_requests;
create policy "archivists update assigned or forwarded requests" on public.document_requests for update using (
  public.is_archivist() and (assigned_archivist_id = auth.uid() or status in ('Approved', 'Forwarded to Archivist', 'Processing', 'Released', 'For Closure'))
) with check (public.is_archivist());
drop policy if exists "admins manage requests" on public.document_requests;
create policy "admins manage requests" on public.document_requests for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "approval actions visible to request participants" on public.approval_actions;
create policy "approval actions visible to request participants" on public.approval_actions for select using (public.can_view_request(request_id));
drop policy if exists "approval actions inserted by approvers" on public.approval_actions;
create policy "approval actions inserted by approvers" on public.approval_actions for insert with check (approver_id = auth.uid() and (public.can_approve_request(request_id) or public.is_admin()));

drop policy if exists "archivist processing visible to authorized users" on public.archivist_processing;
create policy "archivist processing visible to authorized users" on public.archivist_processing for select using (public.can_view_request(request_id) or public.is_archivist());
drop policy if exists "archivists manage processing" on public.archivist_processing;
create policy "archivists manage processing" on public.archivist_processing for all using (public.is_archivist() or public.is_admin()) with check (public.is_archivist() or public.is_admin());

drop policy if exists "closures visible to authorized users" on public.request_closures;
create policy "closures visible to authorized users" on public.request_closures for select using (public.can_view_request(request_id) or public.is_archivist());
drop policy if exists "archivists manage closures" on public.request_closures;
create policy "archivists manage closures" on public.request_closures for all using (public.is_archivist() or public.is_admin()) with check (public.is_archivist() or public.is_admin());

drop policy if exists "incident visibility" on public.incident_reports;
create policy "incident visibility" on public.incident_reports for select using (
  public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo') or public.can_view_request(request_id)
);
drop policy if exists "authorized users create incidents" on public.incident_reports;
create policy "authorized users create incidents" on public.incident_reports for insert with check (public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo'));
drop policy if exists "admins archivists update incidents" on public.incident_reports;
create policy "admins archivists update incidents" on public.incident_reports for update using (public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo')) with check (public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo'));

drop policy if exists "attachments visible to request participants" on public.request_attachments;
create policy "attachments visible to request participants" on public.request_attachments for select using (public.can_view_request(request_id));
drop policy if exists "participants upload request attachments" on public.request_attachments;
create policy "participants upload request attachments" on public.request_attachments for insert with check (
  uploaded_by = auth.uid() and public.can_view_request(request_id)
);
drop policy if exists "admins archivists manage request attachments" on public.request_attachments;
create policy "admins archivists manage request attachments" on public.request_attachments for all using (public.is_admin() or public.is_archivist()) with check (public.is_admin() or public.is_archivist());

drop policy if exists "audit logs visible to authorized users" on public.audit_logs;
create policy "audit logs visible to authorized users" on public.audit_logs for select using (
  public.get_my_role() in ('admin', 'ceo', 'dpo') or user_id = auth.uid() or public.can_view_request(request_id)
);
drop policy if exists "authenticated users insert audit logs" on public.audit_logs;
create policy "authenticated users insert audit logs" on public.audit_logs for insert with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "no client updates to audit logs" on public.audit_logs;
create policy "no client updates to audit logs" on public.audit_logs for update using (false) with check (false);
drop policy if exists "no client deletes from audit logs" on public.audit_logs;
create policy "no client deletes from audit logs" on public.audit_logs for delete using (false);

drop policy if exists "system settings readable" on public.system_settings;
create policy "system settings readable" on public.system_settings for select using (auth.role() = 'authenticated');
drop policy if exists "system settings admin managed" on public.system_settings;
create policy "system settings admin managed" on public.system_settings for all using (public.is_admin()) with check (public.is_admin());
