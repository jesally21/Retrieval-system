create extension if not exists "pgcrypto";

-- Runtime note:
-- The web client expects Supabase auth env vars to be available before login.
-- Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in the deployment
-- environment so the runtime env bootstrap can initialize authentication safely.

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
  created_by uuid references public.profiles(id),
  created_by_name text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  role text not null check (
    role in (
      'requestor',
      'branch_head',
      'sacd_head',
      'department_head',
      'dpo',
      'ceo',
      'archivist',
      'admin',
      'superadmin'
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
  requestor_name text not null default '',
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
  current_approver_name text,
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
  assigned_archivist_name text,
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
  archivist_name text,
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

create table if not exists public.electronic_release_links (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.document_requests(id) on delete cascade,
  electronic_release_reference text not null,
  released_by uuid references public.profiles(id),
  released_by_name text,
  released_at timestamptz,
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
  validated_by_name text,
  validation_date date,
  closure_remarks text,
  closed_by uuid references public.profiles(id),
  closed_by_name text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  reported_by_name text,
  incident_type text not null check (incident_type in ('Lost', 'Missing', 'Damaged', 'Altered', 'Unauthorized Sharing', 'Overdue', 'Access Not Revoked', 'Other')),
  incident_description text not null,
  action_taken text,
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Resolved', 'Closed')),
  resolved_by uuid references public.profiles(id),
  resolved_by_name text,
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
  user_name text,
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

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_requests add column if not exists requestor_name text not null default '';
alter table public.document_requests add column if not exists current_approver_name text;
alter table public.document_requests add column if not exists assigned_archivist_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_by uuid references public.profiles(id);
alter table public.profiles add column if not exists created_by_name text;
alter table public.profiles add column if not exists position text;
alter table public.profiles add column if not exists status text not null default 'Active';
alter table public.archivist_processing add column if not exists archivist_name text;
alter table public.request_closures add column if not exists validated_by_name text;
alter table public.request_closures add column if not exists closed_by_name text;
alter table public.incident_reports add column if not exists reported_by_name text;
alter table public.incident_reports add column if not exists resolved_by_name text;
alter table public.audit_logs add column if not exists user_name text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_status_check;
  end if;

  alter table public.profiles
    add constraint profiles_status_check check (status in ('Active', 'Inactive'));

  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check check (
      role in (
        'requestor',
        'branch_head',
        'sacd_head',
        'department_head',
        'dpo',
        'ceo',
        'archivist',
        'admin',
        'superadmin'
      )
    );

end $$ language plpgsql;

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

create or replace function public.create_document_request(p_request jsonb)
returns public.document_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  p_request := p_request - 'id';
  return public.save_document_request(p_request);
end;
$$;

create or replace function public.save_document_request(p_request jsonb)
returns public.document_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_request public.document_requests%rowtype;
  request_id uuid := nullif(trim(coalesce(p_request->>'id', '')), '')::uuid;
  requestor_id uuid := nullif(trim(coalesce(p_request->>'requestor_id', '')), '')::uuid;
  request_status text := coalesce(nullif(trim(p_request->>'status'), ''), 'Pending Approval');
  requestor_profile public.profiles%rowtype;
  requestor_role text;
  resolved_approver record;
  resolved_current_approver_id uuid := nullif(trim(coalesce(p_request->>'current_approver_id', '')), '')::uuid;
  resolved_current_approver_name text := nullif(trim(coalesce(p_request->>'current_approver_name', '')), '');
  resolved_branch text := nullif(trim(coalesce(p_request->>'branch', '')), '');
  resolved_confidentiality text := coalesce(nullif(trim(p_request->>'confidentiality_level'), ''), 'Normal');
  resolved_document_title text := nullif(trim(coalesce(p_request->>'document_title', '')), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  if requestor_id is null then
    raise exception 'Requestor is required.';
  end if;

  select *
    into requestor_profile
    from public.profiles
    where id = requestor_id;

  if requestor_profile.id is null then
    raise exception 'Requestor profile not found.';
  end if;

  requestor_role := coalesce(nullif(trim(requestor_profile.role), ''), 'requestor');

  if resolved_branch is null then
    resolved_branch := nullif(trim(coalesce(requestor_profile.branch, '')), '');
  end if;

  if resolved_branch is null and requestor_role in ('department_head', 'dpo', 'ceo', 'archivist', 'superadmin') then
    resolved_branch := 'Head Office';
  end if;

  if resolved_document_title is null then
    raise exception 'Document title is required.';
  end if;

  if resolved_branch is null then
    raise exception 'Branch is required.';
  end if;

  if request_id is null then
    if requestor_id <> auth.uid() then
      raise exception 'Requestor mismatch.';
    end if;

    if request_status not in ('Draft', 'Pending Approval') then
      raise exception 'Invalid request status.';
    end if;
  else
    if requestor_id = auth.uid() then
      if not public.can_edit_own_request(request_id) then
        raise exception 'Request cannot be edited in its current state.';
      end if;
    elsif not (public.can_approve_request(request_id) or public.is_archivist() or public.is_superadmin()) then
      raise exception 'Not authorized to update this request.';
    end if;
  end if;

  if request_status = 'Pending Approval' then
    resolved_current_approver_id := null;
    resolved_current_approver_name := null;
  end if;

  if resolved_current_approver_id is null and request_status in ('Draft', 'Pending Approval') then
    select *
      into resolved_approver
      from public.resolve_request_approver(
        requestor_profile.role,
        resolved_branch,
        resolved_confidentiality
      )
      limit 1;
    resolved_current_approver_id := resolved_approver.approver_id;
    resolved_current_approver_name := coalesce(resolved_current_approver_name, resolved_approver.approver_name);
    if resolved_current_approver_id is null then
      raise exception 'No approver found for this request.';
    end if;
  end if;

  insert into public.document_requests (
    id,
    request_no,
    requestor_id,
    requestor_name,
    request_date,
    document_title,
    document_reference_no,
    document_category_id,
    document_type,
    confidentiality_level,
    purpose,
    date_needed,
    borrow_return_due_date,
    remarks,
    branch,
    department,
    position,
    status,
    current_approver_id,
    current_approver_name,
    branch_head_requested_by,
    branch_head_requested_at,
    approved_by,
    approved_at,
    approval_remarks,
    rejected_by,
    rejected_at,
    rejection_reason,
    clarification_remarks,
    forwarded_to_archivist_at,
    assigned_archivist_id,
    assigned_archivist_name,
    agreement_accepted
  )
  values (
    coalesce(request_id, gen_random_uuid()),
    coalesce(nullif(trim(p_request->>'request_no'), ''), public.generate_request_no()),
    requestor_id,
    coalesce(nullif(trim(p_request->>'requestor_name'), ''), requestor_profile.full_name, ''),
    coalesce(nullif(trim(p_request->>'request_date'), '')::date, current_date),
    resolved_document_title,
    nullif(trim(p_request->>'document_reference_no'), ''),
    nullif(trim(p_request->>'document_category_id'), '')::uuid,
    coalesce(nullif(trim(p_request->>'document_type'), ''), 'Physical'),
    coalesce(nullif(trim(p_request->>'confidentiality_level'), ''), 'Normal'),
    coalesce(nullif(trim(p_request->>'purpose'), ''), ''),
    nullif(trim(p_request->>'date_needed'), '')::date,
    nullif(trim(p_request->>'borrow_return_due_date'), '')::date,
    nullif(trim(p_request->>'remarks'), ''),
    resolved_branch,
    nullif(trim(p_request->>'department'), ''),
    nullif(trim(p_request->>'position'), ''),
    request_status,
    resolved_current_approver_id,
    resolved_current_approver_name,
    nullif(trim(p_request->>'branch_head_requested_by'), '')::uuid,
    nullif(trim(p_request->>'branch_head_requested_at'), '')::timestamptz,
    nullif(trim(p_request->>'approved_by'), '')::uuid,
    nullif(trim(p_request->>'approved_at'), '')::timestamptz,
    nullif(trim(p_request->>'approval_remarks'), ''),
    nullif(trim(p_request->>'rejected_by'), '')::uuid,
    nullif(trim(p_request->>'rejected_at'), '')::timestamptz,
    nullif(trim(p_request->>'rejection_reason'), ''),
    nullif(trim(p_request->>'clarification_remarks'), ''),
    nullif(trim(p_request->>'forwarded_to_archivist_at'), '')::timestamptz,
    nullif(trim(p_request->>'assigned_archivist_id'), '')::uuid,
    nullif(trim(p_request->>'assigned_archivist_name'), ''),
    case
      when lower(coalesce(nullif(trim(p_request->>'agreement_accepted'), ''), 'false')) in ('true', 't', '1', 'yes', 'on') then true
      else false
    end
  )
  on conflict (id) do update set
    request_no = excluded.request_no,
    requestor_id = excluded.requestor_id,
    requestor_name = excluded.requestor_name,
    request_date = excluded.request_date,
    document_title = excluded.document_title,
    document_reference_no = excluded.document_reference_no,
    document_category_id = excluded.document_category_id,
    document_type = excluded.document_type,
    confidentiality_level = excluded.confidentiality_level,
    purpose = excluded.purpose,
    date_needed = excluded.date_needed,
    borrow_return_due_date = excluded.borrow_return_due_date,
    remarks = excluded.remarks,
    branch = excluded.branch,
    department = excluded.department,
    position = excluded.position,
    status = excluded.status,
    current_approver_id = excluded.current_approver_id,
    current_approver_name = excluded.current_approver_name,
    branch_head_requested_by = excluded.branch_head_requested_by,
    branch_head_requested_at = excluded.branch_head_requested_at,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    approval_remarks = excluded.approval_remarks,
    rejected_by = excluded.rejected_by,
    rejected_at = excluded.rejected_at,
    rejection_reason = excluded.rejection_reason,
    clarification_remarks = excluded.clarification_remarks,
    forwarded_to_archivist_at = excluded.forwarded_to_archivist_at,
    assigned_archivist_id = excluded.assigned_archivist_id,
    assigned_archivist_name = excluded.assigned_archivist_name,
    agreement_accepted = excluded.agreement_accepted,
    updated_at = now()
  returning * into saved_request;

  return saved_request;
end;
$$;

create or replace function public.save_archivist_processing(
  p_request_id uuid,
  p_record jsonb
)
returns public.archivist_processing
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.archivist_processing%rowtype;
begin
  if p_request_id is null then
    raise exception 'Request id is required.';
  end if;

  insert into public.archivist_processing (
    request_id,
    archivist_id,
    archivist_name,
    date_received,
    date_released,
    borrower_name,
    expected_return_date,
    physical_condition_before_release,
    storage_location,
    electronic_release_method,
    electronic_release_reference,
    access_expiry_date,
    access_revoked,
    deletion_confirmation_required,
    release_remarks
  )
  values (
    p_request_id,
    nullif(trim(coalesce(p_record->>'archivist_id', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'archivist_name', '')), ''),
    nullif(trim(coalesce(p_record->>'date_received', '')), '')::date,
    nullif(trim(coalesce(p_record->>'date_released', '')), '')::date,
    nullif(trim(coalesce(p_record->>'borrower_name', '')), ''),
    nullif(trim(coalesce(p_record->>'expected_return_date', '')), '')::date,
    nullif(trim(coalesce(p_record->>'physical_condition_before_release', '')), ''),
    nullif(trim(coalesce(p_record->>'storage_location', '')), ''),
    nullif(trim(coalesce(p_record->>'electronic_release_method', '')), ''),
    nullif(trim(coalesce(p_record->>'electronic_release_reference', '')), ''),
    nullif(trim(coalesce(p_record->>'access_expiry_date', '')), '')::date,
    coalesce((p_record->>'access_revoked')::boolean, false),
    coalesce((p_record->>'deletion_confirmation_required')::boolean, false),
    nullif(trim(coalesce(p_record->>'release_remarks', '')), '')
  )
  on conflict (request_id) do update set
    archivist_id = excluded.archivist_id,
    archivist_name = excluded.archivist_name,
    date_received = excluded.date_received,
    date_released = excluded.date_released,
    borrower_name = excluded.borrower_name,
    expected_return_date = excluded.expected_return_date,
    physical_condition_before_release = excluded.physical_condition_before_release,
    storage_location = excluded.storage_location,
    electronic_release_method = excluded.electronic_release_method,
    electronic_release_reference = excluded.electronic_release_reference,
    access_expiry_date = excluded.access_expiry_date,
    access_revoked = excluded.access_revoked,
    deletion_confirmation_required = excluded.deletion_confirmation_required,
    release_remarks = excluded.release_remarks,
    updated_at = now()
  returning * into saved_record;

  return saved_record;
end;
$$;

create or replace function public.save_electronic_release_link(
  p_request_id uuid,
  p_record jsonb
)
returns public.electronic_release_links
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.electronic_release_links%rowtype;
begin
  if p_request_id is null then
    raise exception 'Request id is required.';
  end if;

  insert into public.electronic_release_links (
    request_id,
    electronic_release_reference,
    released_by,
    released_by_name,
    released_at
  )
  values (
    p_request_id,
    nullif(trim(coalesce(p_record->>'electronic_release_reference', '')), ''),
    nullif(trim(coalesce(p_record->>'released_by', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'released_by_name', '')), ''),
    nullif(trim(coalesce(p_record->>'released_at', '')), '')::timestamptz
  )
  on conflict (request_id) do update set
    electronic_release_reference = excluded.electronic_release_reference,
    released_by = excluded.released_by,
    released_by_name = excluded.released_by_name,
    released_at = excluded.released_at,
    updated_at = now()
  returning * into saved_record;

  return saved_record;
end;
$$;

create or replace function public.save_request_closure(
  p_request_id uuid,
  p_record jsonb
)
returns public.request_closures
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.request_closures%rowtype;
begin
  if p_request_id is null then
    raise exception 'Request id is required.';
  end if;

  insert into public.request_closures (
    request_id,
    date_returned,
    condition_upon_return,
    is_complete,
    has_damage,
    has_markings,
    missing_pages,
    refiled_location,
    access_revoked,
    deletion_confirmed,
    validated_by,
    validated_by_name,
    validation_date,
    closure_remarks,
    closed_by,
    closed_by_name,
    closed_at
  )
  values (
    p_request_id,
    nullif(trim(coalesce(p_record->>'date_returned', '')), '')::date,
    nullif(trim(coalesce(p_record->>'condition_upon_return', '')), ''),
    coalesce((p_record->>'is_complete')::boolean, false),
    coalesce((p_record->>'has_damage')::boolean, false),
    coalesce((p_record->>'has_markings')::boolean, false),
    coalesce((p_record->>'missing_pages')::boolean, false),
    nullif(trim(coalesce(p_record->>'refiled_location', '')), ''),
    coalesce((p_record->>'access_revoked')::boolean, false),
    coalesce((p_record->>'deletion_confirmed')::boolean, false),
    nullif(trim(coalesce(p_record->>'validated_by', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'validated_by_name', '')), ''),
    nullif(trim(coalesce(p_record->>'validation_date', '')), '')::date,
    nullif(trim(coalesce(p_record->>'closure_remarks', '')), ''),
    nullif(trim(coalesce(p_record->>'closed_by', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'closed_by_name', '')), ''),
    nullif(trim(coalesce(p_record->>'closed_at', '')), '')::timestamptz
  )
  on conflict (request_id) do update set
    date_returned = excluded.date_returned,
    condition_upon_return = excluded.condition_upon_return,
    is_complete = excluded.is_complete,
    has_damage = excluded.has_damage,
    has_markings = excluded.has_markings,
    missing_pages = excluded.missing_pages,
    refiled_location = excluded.refiled_location,
    access_revoked = excluded.access_revoked,
    deletion_confirmed = excluded.deletion_confirmed,
    validated_by = excluded.validated_by,
    validated_by_name = excluded.validated_by_name,
    validation_date = excluded.validation_date,
    closure_remarks = excluded.closure_remarks,
    closed_by = excluded.closed_by,
    closed_by_name = excluded.closed_by_name,
    closed_at = excluded.closed_at,
    updated_at = now()
  returning * into saved_record;

  return saved_record;
end;
$$;

create or replace function public.save_incident_report(p_record jsonb)
returns public.incident_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.incident_reports%rowtype;
begin
  insert into public.incident_reports (
    id,
    request_id,
    reported_by,
    reported_by_name,
    incident_type,
    incident_description,
    action_taken,
    status,
    resolved_by,
    resolved_by_name,
    resolved_at,
    created_at
  )
  values (
    coalesce(nullif(trim(coalesce(p_record->>'id', '')), '')::uuid, gen_random_uuid()),
    nullif(trim(coalesce(p_record->>'request_id', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'reported_by', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'reported_by_name', '')), ''),
    coalesce(nullif(trim(p_record->>'incident_type'), ''), 'Other'),
    coalesce(nullif(trim(p_record->>'incident_description'), ''), ''),
    nullif(trim(coalesce(p_record->>'action_taken', '')), ''),
    coalesce(nullif(trim(p_record->>'status'), ''), 'Open'),
    nullif(trim(coalesce(p_record->>'resolved_by', '')), '')::uuid,
    nullif(trim(coalesce(p_record->>'resolved_by_name', '')), ''),
    nullif(trim(coalesce(p_record->>'resolved_at', '')), '')::timestamptz,
    coalesce(nullif(trim(coalesce(p_record->>'created_at', '')), '')::timestamptz, now())
  )
  on conflict (id) do update set
    request_id = excluded.request_id,
    reported_by = excluded.reported_by,
    reported_by_name = excluded.reported_by_name,
    incident_type = excluded.incident_type,
    incident_description = excluded.incident_description,
    action_taken = excluded.action_taken,
    status = excluded.status,
    resolved_by = excluded.resolved_by,
    resolved_by_name = excluded.resolved_by_name,
    resolved_at = excluded.resolved_at,
    updated_at = now()
  returning * into saved_record;

  return saved_record;
end;
$$;

create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required.';
  end if;

  if not (public.is_superadmin() or auth.role() = 'service_role') then
    raise exception 'Not authorized to delete users.';
  end if;

  delete from public.approval_actions where approver_id = p_user_id;

  delete from public.document_requests where requestor_id = p_user_id;

  update public.document_requests
    set
      current_approver_id = case when current_approver_id = p_user_id then null else current_approver_id end,
      current_approver_name = case when current_approver_id = p_user_id then null else current_approver_name end,
      branch_head_requested_by = case when branch_head_requested_by = p_user_id then null else branch_head_requested_by end,
      approved_by = case when approved_by = p_user_id then null else approved_by end,
      rejected_by = case when rejected_by = p_user_id then null else rejected_by end,
      assigned_archivist_id = case when assigned_archivist_id = p_user_id then null else assigned_archivist_id end,
      assigned_archivist_name = case when assigned_archivist_id = p_user_id then null else assigned_archivist_name end,
      updated_at = now()
    where requestor_id = p_user_id
       or current_approver_id = p_user_id
       or branch_head_requested_by = p_user_id
       or approved_by = p_user_id
       or rejected_by = p_user_id
       or assigned_archivist_id = p_user_id;

  delete from public.document_requests where requestor_id = p_user_id;

  update public.archivist_processing
    set archivist_id = null,
        archivist_name = case when archivist_id = p_user_id then null else archivist_name end,
        updated_at = now()
    where archivist_id = p_user_id;

  update public.request_closures
    set validated_by = case when validated_by = p_user_id then null else validated_by end,
        validated_by_name = case when validated_by = p_user_id then null else validated_by_name end,
        closed_by = case when closed_by = p_user_id then null else closed_by end,
        closed_by_name = case when closed_by = p_user_id then null else closed_by_name end,
        updated_at = now()
    where validated_by = p_user_id or closed_by = p_user_id;

  update public.incident_reports
    set resolved_by = case when resolved_by = p_user_id then null else resolved_by end,
        resolved_by_name = case when resolved_by = p_user_id then null else resolved_by_name end,
        updated_at = now()
    where reported_by = p_user_id or resolved_by = p_user_id;

  delete from public.incident_reports where reported_by = p_user_id;

  update public.request_attachments
    set uploaded_by = null
    where uploaded_by = p_user_id;

  update public.audit_logs
    set user_id = null,
        user_name = case when user_id = p_user_id then null else user_name end
    where user_id = p_user_id;

  update public.system_settings
    set updated_by = null
    where updated_by = p_user_id;

  update public.app_state
    set updated_by = null
    where updated_by = p_user_id;

  update public.profiles
    set created_by = null
    where created_by = p_user_id;

  delete from public.profiles where id = p_user_id;

  delete from auth.users where id = p_user_id;
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := coalesce(
    nullif(trim(metadata->>'role'), ''),
    nullif(trim(coalesce(new.raw_app_meta_data, '{}'::jsonb)->>'role'), ''),
    'requestor'
  );
  requested_status text := coalesce(nullif(trim(metadata->>'status'), ''), 'Active');
  requested_created_by uuid := null;
begin
  if requested_role not in (
    'requestor',
    'branch_head',
    'sacd_head',
    'department_head',
    'dpo',
    'ceo',
    'archivist',
    'admin',
    'superadmin'
  ) then
    requested_role := 'requestor';
  end if;

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
    role = coalesce(excluded.role, public.profiles.role),
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_auth_users_to_profiles()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
  select
    u.id,
    coalesce(
      nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), ''),
      nullif(trim(u.email), ''),
      'User'
    ),
    coalesce(nullif(trim(u.email), ''), ''),
    nullif(trim(u.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(u.raw_user_meta_data->>'branch'), ''),
    nullif(trim(u.raw_user_meta_data->>'department'), ''),
    nullif(trim(u.raw_user_meta_data->>'position'), ''),
    case
      when nullif(trim(u.raw_user_meta_data->>'created_by'), '') is not null
        and trim(u.raw_user_meta_data->>'created_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and exists (
          select 1
          from public.profiles p
          where p.id = trim(u.raw_user_meta_data->>'created_by')::uuid
        )
      then trim(u.raw_user_meta_data->>'created_by')::uuid
      else null
    end,
    nullif(trim(u.raw_user_meta_data->>'created_by_name'), ''),
    case
      when coalesce(nullif(trim(u.raw_user_meta_data->>'status'), ''), 'Active') in ('Active', 'Inactive')
        then coalesce(nullif(trim(u.raw_user_meta_data->>'status'), ''), 'Active')
      else 'Active'
    end,
    case
      when coalesce(
        nullif(trim(u.raw_user_meta_data->>'role'), ''),
        nullif(trim(coalesce(u.raw_app_meta_data, '{}'::jsonb)->>'role'), ''),
        'requestor'
      ) = 'admin' then 'superadmin'
      when coalesce(
        nullif(trim(u.raw_user_meta_data->>'role'), ''),
        nullif(trim(coalesce(u.raw_app_meta_data, '{}'::jsonb)->>'role'), ''),
        'requestor'
      ) = 'sacd_head' then 'department_head'
      when coalesce(
        nullif(trim(u.raw_user_meta_data->>'role'), ''),
        nullif(trim(coalesce(u.raw_app_meta_data, '{}'::jsonb)->>'role'), ''),
        'requestor'
      ) in (
        'requestor',
        'branch_head',
        'department_head',
        'dpo',
        'ceo',
        'archivist',
        'superadmin'
      ) then coalesce(
        nullif(trim(u.raw_user_meta_data->>'role'), ''),
        nullif(trim(coalesce(u.raw_app_meta_data, '{}'::jsonb)->>'role'), ''),
        'requestor'
      )
      else 'requestor'
    end,
    coalesce(nullif(trim(u.raw_user_meta_data->>'status'), ''), 'Active') = 'Active'
  from auth.users u
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
    role = coalesce(excluded.role, public.profiles.role),
    is_active = excluded.is_active,
    updated_at = now();
end;
$$;

create or replace function public.set_system_settings_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.updated_by = auth.uid();
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
  select coalesce(public.get_my_role() in ('admin', 'superadmin', 'ceo', 'dpo'), false)
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.get_my_role() in ('admin', 'superadmin'), false)
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
        or public.is_archivist()
        or public.is_executive_or_privacy()
        or public.is_superadmin()
        or (p.role = 'branch_head' and p.branch = dr.branch)
      )
  )
$$;

create or replace function public.can_edit_own_request(target_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.document_requests dr
    where dr.id = target_request_id
      and dr.requestor_id = auth.uid()
      and dr.status = 'Draft'
  )
$$;

create or replace function public.resolve_request_approver(
  p_requestor_role text,
  p_branch text,
  p_confidentiality text
)
returns table (
  approver_id uuid,
  approver_name text,
  approver_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  approver_profile public.profiles%rowtype;
  resolved_approver_role text;
begin
  select case
    when ar.approver_role = 'sacd_head' then 'department_head'
    when ar.approver_role = 'admin' then 'superadmin'
    else ar.approver_role
  end
    into resolved_approver_role
    from public.approval_routes ar
    where ar.is_active = true
      and coalesce(ar.confidentiality_level, p_confidentiality) = p_confidentiality
      and (
        ar.requester_role is null
        or ar.requester_role = p_requestor_role
      )
      and (
        ar.branch is null
        or ar.branch = p_branch
      )
    order by
      case when ar.confidentiality_level = p_confidentiality then 0 else 1 end,
      case when ar.branch = p_branch then 0 else 1 end,
      ar.step_order asc,
      ar.created_at asc
    limit 1;

  if resolved_approver_role is null then
    if p_confidentiality = 'Confidential' then
      resolved_approver_role := 'dpo';
    elsif p_requestor_role = 'requestor' then
      if p_branch = 'Head Office' then
        resolved_approver_role := 'department_head';
      else
        resolved_approver_role := 'branch_head';
      end if;
    elsif p_requestor_role = 'branch_head' then
      resolved_approver_role := 'department_head';
    elsif p_requestor_role = 'department_head' then
      resolved_approver_role := 'ceo';
    elsif p_requestor_role in ('dpo', 'ceo') then
      resolved_approver_role := 'superadmin';
    end if;
  end if;

  if resolved_approver_role = 'branch_head' then
    select *
      into approver_profile
      from public.profiles
      where role = 'branch_head' and is_active = true and branch = p_branch
      order by created_at asc
      limit 1;
  elsif resolved_approver_role = 'department_head' then
    select *
      into approver_profile
      from public.profiles
      where role = 'department_head' and is_active = true
      order by created_at asc
      limit 1;
  elsif resolved_approver_role = 'dpo' then
    select *
      into approver_profile
      from public.profiles
      where role = 'dpo' and is_active = true
      order by created_at asc
      limit 1;
    if approver_profile.id is null then
      select *
        into approver_profile
        from public.profiles
        where role = 'ceo' and is_active = true
        order by created_at asc
        limit 1;
    end if;
  elsif resolved_approver_role = 'ceo' then
    select *
      into approver_profile
      from public.profiles
      where role = 'ceo' and is_active = true
      order by created_at asc
      limit 1;
  elsif resolved_approver_role = 'superadmin' then
    select *
      into approver_profile
      from public.profiles
      where role = 'superadmin' and is_active = true
      order by created_at asc
      limit 1;
    if approver_profile.id is null then
      select *
        into approver_profile
        from public.profiles
        where role = 'ceo' and is_active = true
        order by created_at asc
        limit 1;
    end if;
  end if;

  approver_id := approver_profile.id;
  approver_name := approver_profile.full_name;
  approver_role := approver_profile.role;
  return next;
end;
$$;

drop trigger if exists set_updated_at_branches on public.branches;
create trigger set_updated_at_branches before update on public.branches for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_departments on public.departments;
create trigger set_updated_at_departments before update on public.departments for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_document_categories on public.document_categories;
create trigger set_updated_at_document_categories before update on public.document_categories for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update on auth.users for each row execute function public.handle_new_user();

do $$
begin
  perform public.sync_auth_users_to_profiles();
end $$ language plpgsql;
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
drop trigger if exists set_updated_at_electronic_release_links on public.electronic_release_links;
create trigger set_updated_at_electronic_release_links before update on public.electronic_release_links for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_request_closures on public.request_closures;
create trigger set_updated_at_request_closures before update on public.request_closures for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_incident_reports on public.incident_reports;
create trigger set_updated_at_incident_reports before update on public.incident_reports for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_system_settings on public.system_settings;
create trigger set_updated_at_system_settings before update on public.system_settings for each row execute function public.set_updated_at();
drop trigger if exists set_system_settings_updated_by on public.system_settings;
create trigger set_system_settings_updated_by before insert or update on public.system_settings for each row execute function public.set_system_settings_updated_by();

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

delete from public.branches where name not in (
  'Barbaza',
  'Culasi',
  'Sibalom',
  'San Jose',
  'Balasan',
  'Barotac Viejo',
  'Caticlan',
  'Molo',
  'Kalibo',
  'Janiuay',
  'Calinog',
  'Sara',
  'Pres. Roxas',
  'Altavas'
);

insert into public.branches (name) values
  ('Barbaza'),
  ('Culasi'),
  ('Sibalom'),
  ('San Jose'),
  ('Balasan'),
  ('Barotac Viejo'),
  ('Caticlan'),
  ('Molo'),
  ('Kalibo'),
  ('Janiuay'),
  ('Calinog'),
  ('Sara'),
  ('Pres. Roxas'),
  ('Altavas')
on conflict (name) do nothing;

delete from public.departments where name not in (
  'ICT Department',
  'Membership & Marketing Department',
  'Savings & Credit Department',
  'Finance & Accounting Department',
  'Human Resources & Administration Department',
  'Internal Audit Department'
);

insert into public.departments (name) values
  ('ICT Department'),
  ('Membership & Marketing Department'),
  ('Savings & Credit Department'),
  ('Finance & Accounting Department'),
  ('Human Resources & Administration Department'),
  ('Internal Audit Department')
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
alter table public.electronic_release_links enable row level security;
alter table public.request_closures enable row level security;
alter table public.incident_reports enable row level security;
alter table public.request_attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.app_state enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.branches to anon, authenticated;
grant select on public.departments to anon, authenticated;
grant select on public.document_categories to anon, authenticated;

grant select, insert, update, delete on public.branches to authenticated, service_role;
grant select, insert, update, delete on public.departments to authenticated, service_role;
grant select, insert, update, delete on public.document_categories to authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.approval_routes to authenticated, service_role;
grant select, insert, update, delete on public.document_requests to authenticated, service_role;
grant select, insert, update, delete on public.approval_actions to authenticated, service_role;
grant select, insert, update, delete on public.archivist_processing to authenticated, service_role;
grant select, insert, update, delete on public.electronic_release_links to authenticated, service_role;
grant select, insert, update, delete on public.request_closures to authenticated, service_role;
grant select, insert, update, delete on public.incident_reports to authenticated, service_role;
grant select, insert, update, delete on public.request_attachments to authenticated, service_role;
grant select, insert on public.audit_logs to authenticated, service_role;
grant select, insert, update, delete on public.system_settings to authenticated, service_role;
grant select, insert, update, delete on public.app_state to authenticated, service_role;

grant execute on function public.get_my_role() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_superadmin() to anon, authenticated, service_role;
grant execute on function public.is_archivist() to anon, authenticated, service_role;
grant execute on function public.is_executive_or_privacy() to anon, authenticated, service_role;
grant execute on function public.can_edit_own_request(uuid) to anon, authenticated, service_role;
grant execute on function public.create_document_request(jsonb) to authenticated, service_role;
grant execute on function public.save_document_request(jsonb) to authenticated, service_role;
grant execute on function public.save_archivist_processing(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_electronic_release_link(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_request_closure(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_incident_report(jsonb) to authenticated, service_role;
grant execute on function public.delete_user_account(uuid) to authenticated, service_role;
grant execute on function public.can_approve_request(uuid) to anon, authenticated, service_role;
grant execute on function public.can_view_request(uuid) to anon, authenticated, service_role;
grant execute on function public.resolve_request_approver(text, text, text) to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant select, insert, update on public.profiles to supabase_auth_admin;
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$ language plpgsql;

drop policy if exists "reference data readable branches" on public.branches;
create policy "reference data readable branches" on public.branches for select using (true);
drop policy if exists "reference data admin managed branches" on public.branches;
create policy "reference data admin managed branches" on public.branches for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "reference data readable departments" on public.departments;
create policy "reference data readable departments" on public.departments for select using (true);
drop policy if exists "reference data admin managed departments" on public.departments;
create policy "reference data admin managed departments" on public.departments for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "reference data readable categories" on public.document_categories;
create policy "reference data readable categories" on public.document_categories for select using (true);
drop policy if exists "reference data admin managed categories" on public.document_categories;
create policy "reference data admin managed categories" on public.document_categories for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "profiles readable by self and admins" on public.profiles;
drop policy if exists "profiles readable by self and superadmin" on public.profiles;
create policy "profiles readable by self and superadmin" on public.profiles for select using (id = auth.uid() or public.is_superadmin());
drop policy if exists "profiles update self basic info" on public.profiles;
create policy "profiles update self basic info" on public.profiles for update using (id = auth.uid()) with check (
  id = auth.uid()
  and role = public.get_my_role()
  and is_active = true
);
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "superadmin manage profiles" on public.profiles;
create policy "superadmin manage non-superadmin profiles" on public.profiles for all using (public.is_superadmin() and role <> 'superadmin') with check (public.is_superadmin() and role <> 'superadmin');

drop policy if exists "approval routes readable" on public.approval_routes;
create policy "approval routes readable" on public.approval_routes for select using (auth.role() = 'authenticated');
drop policy if exists "approval routes admin managed" on public.approval_routes;
create policy "approval routes admin managed" on public.approval_routes for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "requestors create own requests" on public.document_requests;
create policy "requestors create own requests" on public.document_requests for insert with check (
  requestor_id = auth.uid()
  and status in ('Draft', 'Pending Approval')
  and public.get_my_role() in ('requestor', 'branch_head', 'department_head', 'superadmin')
);
drop policy if exists "request visibility by ownership routing and role" on public.document_requests;
create policy "request visibility by ownership routing and role" on public.document_requests for select using (public.can_view_request(id));
drop policy if exists "requestors update editable own requests" on public.document_requests;
create policy "requestors update editable own requests" on public.document_requests for update using (
  public.can_edit_own_request(id)
) with check (requestor_id = auth.uid());
drop policy if exists "requestors delete own requests" on public.document_requests;
create policy "requestors delete own requests" on public.document_requests for delete using (requestor_id = auth.uid());
drop policy if exists "approvers update routed requests" on public.document_requests;
create policy "approvers update routed requests" on public.document_requests for update using (public.can_approve_request(id)) with check (public.can_approve_request(id));
drop policy if exists "archivists update assigned or forwarded requests" on public.document_requests;
create policy "archivists update assigned or forwarded requests" on public.document_requests for update using (
  public.is_archivist() and (assigned_archivist_id = auth.uid() or status in ('Approved', 'Forwarded to Archivist', 'Processing', 'Released', 'For Closure'))
) with check (public.is_archivist());
drop policy if exists "admins manage requests" on public.document_requests;
drop policy if exists "superadmin manage requests" on public.document_requests;
create policy "superadmin manage requests" on public.document_requests for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "approval actions visible to request participants" on public.approval_actions;
create policy "approval actions visible to request participants" on public.approval_actions for select using (public.can_view_request(request_id));
drop policy if exists "approval actions inserted by approvers" on public.approval_actions;
create policy "approval actions inserted by approvers" on public.approval_actions for insert with check (approver_id = auth.uid() and (public.can_approve_request(request_id) or public.is_admin()));

drop policy if exists "archivist processing visible to authorized users" on public.archivist_processing;
create policy "archivist processing visible to authorized users" on public.archivist_processing for select using (public.can_view_request(request_id) or public.is_archivist());
drop policy if exists "archivists manage processing" on public.archivist_processing;
create policy "archivists manage processing" on public.archivist_processing for all using (public.is_archivist() or public.is_admin()) with check (public.is_archivist() or public.is_admin());

drop policy if exists "electronic release links visible to request participants" on public.electronic_release_links;
create policy "electronic release links visible to request participants" on public.electronic_release_links for select using (
  public.is_superadmin()
  or public.is_archivist()
  or exists (
    select 1
    from public.document_requests dr
    where dr.id = request_id
      and dr.requestor_id = auth.uid()
  )
);
drop policy if exists "archivists manage electronic release links" on public.electronic_release_links;
create policy "archivists manage electronic release links" on public.electronic_release_links for all using (
  public.is_archivist() or public.is_superadmin()
) with check (
  public.is_archivist() or public.is_superadmin()
);

drop policy if exists "closures visible to authorized users" on public.request_closures;
create policy "closures visible to authorized users" on public.request_closures for select using (public.can_view_request(request_id) or public.is_archivist());
drop policy if exists "archivists manage closures" on public.request_closures;
create policy "archivists manage closures" on public.request_closures for all using (public.is_archivist() or public.is_admin()) with check (public.is_archivist() or public.is_admin());

drop policy if exists "incident visibility" on public.incident_reports;
create policy "incident visibility" on public.incident_reports for select using (
  public.get_my_role() in ('archivist', 'dpo', 'ceo') or public.can_view_request(request_id)
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
  public.is_superadmin() or user_id = auth.uid() or public.can_view_request(request_id)
);
drop policy if exists "authenticated users insert audit logs" on public.audit_logs;
create policy "authenticated users insert audit logs" on public.audit_logs for insert with check (auth.uid() = user_id or public.is_superadmin());
drop policy if exists "no client updates to audit logs" on public.audit_logs;
create policy "no client updates to audit logs" on public.audit_logs for update using (false) with check (false);
drop policy if exists "no client deletes from audit logs" on public.audit_logs;
create policy "no client deletes from audit logs" on public.audit_logs for delete using (false);

drop policy if exists "system settings readable" on public.system_settings;
create policy "system settings readable" on public.system_settings for select using (public.is_superadmin());
drop policy if exists "system settings admin managed" on public.system_settings;
create policy "system settings admin managed" on public.system_settings for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "app state readable" on public.app_state;
create policy "app state readable" on public.app_state for select using (public.is_superadmin());
drop policy if exists "app state managed" on public.app_state;
create policy "app state managed" on public.app_state for all using (public.is_superadmin()) with check (public.is_superadmin());

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

alter table storage.objects enable row level security;

drop policy if exists "profile avatars readable" on storage.objects;
create policy "profile avatars readable" on storage.objects
for select
using (bucket_id = 'profile-avatars');

drop policy if exists "profile avatars upload own files" on storage.objects;
create policy "profile avatars upload own files" on storage.objects
for insert
with check (
  bucket_id = 'profile-avatars'
  and auth.uid() is not null
  and split_part(name, '/', 1) = auth.uid()::text
);
