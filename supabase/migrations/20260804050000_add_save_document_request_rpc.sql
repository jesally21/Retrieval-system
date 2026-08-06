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

grant execute on function public.save_document_request(jsonb) to authenticated, service_role;
