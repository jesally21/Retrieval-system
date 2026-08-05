create or replace function public.create_document_request(p_request jsonb)
returns public.document_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_request public.document_requests%rowtype;
  requestor_id uuid := nullif(trim(coalesce(p_request->>'requestor_id', '')), '')::uuid;
  request_status text := coalesce(nullif(trim(p_request->>'status'), ''), 'Pending Approval');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  if requestor_id is null or requestor_id <> auth.uid() then
    raise exception 'Requestor mismatch.';
  end if;

  if request_status not in ('Draft', 'Pending Approval') then
    raise exception 'Invalid request status.';
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
    coalesce(nullif(trim(p_request->>'id'), '')::uuid, gen_random_uuid()),
    coalesce(nullif(trim(p_request->>'request_no'), ''), public.generate_request_no()),
    requestor_id,
    coalesce(nullif(trim(p_request->>'requestor_name'), ''), ''),
    coalesce(nullif(trim(p_request->>'request_date'), '')::date, current_date),
    coalesce(nullif(trim(p_request->>'document_title'), ''), 'Untitled'),
    nullif(trim(p_request->>'document_reference_no'), ''),
    nullif(trim(p_request->>'document_category_id'), '')::uuid,
    coalesce(nullif(trim(p_request->>'document_type'), ''), 'Physical'),
    coalesce(nullif(trim(p_request->>'confidentiality_level'), ''), 'Normal'),
    coalesce(nullif(trim(p_request->>'purpose'), ''), ''),
    nullif(trim(p_request->>'date_needed'), '')::date,
    nullif(trim(p_request->>'borrow_return_due_date'), '')::date,
    nullif(trim(p_request->>'remarks'), ''),
    coalesce(nullif(trim(p_request->>'branch'), ''), 'Head Office'),
    nullif(trim(p_request->>'department'), ''),
    nullif(trim(p_request->>'position'), ''),
    request_status,
    nullif(trim(p_request->>'current_approver_id'), '')::uuid,
    nullif(trim(p_request->>'current_approver_name'), ''),
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
  returning * into inserted_request;

  return inserted_request;
end;
$$;

grant execute on function public.create_document_request(jsonb) to authenticated, service_role;
