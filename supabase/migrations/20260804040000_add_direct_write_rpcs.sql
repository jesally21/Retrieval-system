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

grant execute on function public.save_archivist_processing(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_request_closure(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_incident_report(jsonb) to authenticated, service_role;
