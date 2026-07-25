create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  gender text not null default 'male' check (gender in ('male', 'female')),
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
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  requestor_id uuid references public.profiles(id),
  request_date date default current_date,
  document_title text not null,
  document_reference_no text,
  document_type text not null check (document_type in ('Physical', 'Electronic')),
  confidentiality_level text not null default 'Normal' check (confidentiality_level in ('Normal', 'Confidential', 'Highly Sensitive')),
  purpose text not null,
  date_needed date not null,
  borrow_return_due_date date not null,
  remarks text,
  branch text,
  department text,
  position text,
  status text not null default 'Pending Approval',
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.archivist_processing (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.document_requests(id) on delete cascade,
  archivist_id uuid references public.profiles(id),
  date_received date,
  date_released date,
  borrower_name text,
  expected_return_date date,
  physical_condition_before_release text,
  storage_location text,
  electronic_release_method text check (electronic_release_method in ('Email', 'Shared Drive', 'Shared Link', 'Cloud Platform', 'Other')),
  electronic_release_reference text,
  access_expiry_date date,
  deletion_confirmation_required boolean default false,
  release_remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.request_closures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.document_requests(id) on delete cascade,
  date_returned date,
  condition_upon_return text,
  is_complete boolean,
  has_damage boolean default false,
  has_markings boolean default false,
  missing_pages boolean default false,
  refiled_location text,
  access_revoked boolean default false,
  deletion_confirmed boolean default false,
  validated_by uuid references public.profiles(id),
  validation_date date,
  closure_remarks text,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.document_requests(id),
  reported_by uuid references public.profiles(id),
  incident_type text not null check (incident_type in ('Lost', 'Missing', 'Damaged', 'Altered', 'Unauthorized Sharing', 'Overdue', 'Access Not Revoked', 'Other')),
  incident_description text not null,
  action_taken text,
  status text default 'Open' check (status in ('Open', 'Under Review', 'Resolved', 'Closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.document_requests(id),
  user_id uuid references public.profiles(id),
  action text not null,
  old_status text,
  new_status text,
  remarks text,
  created_at timestamptz default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into public.branches (name) values
  ('Main Office'), ('Culasi'), ('Sibalom'), ('San Jose'), ('Balasan'), ('Barotac Viejo'),  ('Molo'), ('Janiuay'), ('Caticlan'), ('Kalibo'), ('San Remigio')
on conflict (name) do nothing;

insert into public.departments (name) values
  ('ICT Department'), ('HRAD'), ('Accounting'), ('Audit'), ('SACD'), ('Lending'), ('Savings'), ('Broadband Division'), ('Records / Archive')
on conflict (name) do nothing;

insert into public.document_categories (name, description) values
  ('Member Records', 'Member profile and account documents'),
  ('Finance Records', 'Accounting, ledger, and payroll documents'),
  ('HR Records', 'Employee and personnel documents'),
  ('Board Records', 'Board resolutions, minutes, and corporate records')
on conflict (name) do nothing;

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(public.get_my_role() = 'admin', false)
$$;

create or replace function public.is_archivist()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(public.get_my_role() = 'archivist', false)
$$;

create or replace function public.can_approve_request(target_request_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.document_requests
    where id = target_request_id
      and current_approver_id = auth.uid()
  ) or public.is_admin()
$$;

create or replace function public.is_executive_or_privacy()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(public.get_my_role() in ('admin', 'ceo', 'dpo'), false)
$$;

alter table public.profiles enable row level security;
alter table public.document_requests enable row level security;
alter table public.archivist_processing enable row level security;
alter table public.request_closures enable row level security;
alter table public.incident_reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.document_categories enable row level security;

create policy "profiles readable by self and admins" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "requestors create own requests" on public.document_requests for insert with check (requestor_id = auth.uid());
create policy "request visibility by ownership routing and role" on public.document_requests for select using (
  requestor_id = auth.uid()
  or current_approver_id = auth.uid()
  or assigned_archivist_id = auth.uid()
  or public.is_executive_or_privacy()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'branch_head'
      and p.branch = document_requests.branch
  )
);
create policy "requestors update editable own requests" on public.document_requests for update using (
  requestor_id = auth.uid() and status in ('Draft', 'Needs Clarification', 'Pending Approval')
) with check (requestor_id = auth.uid());
create policy "requestors delete own requests" on public.document_requests for delete using (requestor_id = auth.uid());
create policy "approvers update routed requests" on public.document_requests for update using (public.can_approve_request(id)) with check (public.can_approve_request(id));
create policy "archivists update assigned or forwarded requests" on public.document_requests for update using (
  public.is_archivist() and (assigned_archivist_id = auth.uid() or status in ('Approved', 'Forwarded to Archivist', 'Processing'))
) with check (public.is_archivist());
create policy "admins manage requests" on public.document_requests for all using (public.is_admin()) with check (public.is_admin());

create policy "archivist processing visible to authorized users" on public.archivist_processing for select using (
  public.is_admin()
  or public.is_archivist()
  or exists (select 1 from public.document_requests dr where dr.id = request_id and (dr.requestor_id = auth.uid() or dr.current_approver_id = auth.uid()))
);
create policy "archivists manage processing" on public.archivist_processing for all using (public.is_archivist() or public.is_admin()) with check (public.is_archivist() or public.is_admin());

create policy "closures visible to authorized users" on public.request_closures for select using (
  public.is_admin()
  or public.is_archivist()
  or exists (select 1 from public.document_requests dr where dr.id = request_id and dr.requestor_id = auth.uid())
);
create policy "archivists manage closures" on public.request_closures for all using (public.is_archivist() or public.is_admin()) with check (public.is_archivist() or public.is_admin());

create policy "incident visibility" on public.incident_reports for select using (
  public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo')
  or exists (select 1 from public.document_requests dr where dr.id = request_id and dr.requestor_id = auth.uid())
);
create policy "authorized users create incidents" on public.incident_reports for insert with check (public.get_my_role() in ('admin', 'archivist', 'dpo', 'ceo'));
create policy "admins archivists update incidents" on public.incident_reports for update using (public.get_my_role() in ('admin', 'archivist')) with check (public.get_my_role() in ('admin', 'archivist'));

create policy "audit logs visible to authorized users" on public.audit_logs for select using (
  public.get_my_role() in ('admin', 'ceo', 'dpo')
  or user_id = auth.uid()
  or exists (select 1 from public.document_requests dr where dr.id = request_id and dr.requestor_id = auth.uid())
);
create policy "authenticated users insert audit logs" on public.audit_logs for insert with check (auth.uid() = user_id or public.is_admin());

create policy "no client updates to audit logs" on public.audit_logs for update using (false) with check (false);
create policy "no client deletes from audit logs" on public.audit_logs for delete using (false);

create policy "reference data readable" on public.branches for select using (true);
create policy "reference data admin managed branches" on public.branches for all using (public.is_admin()) with check (public.is_admin());
create policy "reference data readable departments" on public.departments for select using (true);
create policy "reference data admin managed departments" on public.departments for all using (public.is_admin()) with check (public.is_admin());
create policy "reference data readable categories" on public.document_categories for select using (true);
create policy "reference data admin managed categories" on public.document_categories for all using (public.is_admin()) with check (public.is_admin());
