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
    where current_approver_id = p_user_id
       or branch_head_requested_by = p_user_id
       or approved_by = p_user_id
       or rejected_by = p_user_id
       or assigned_archivist_id = p_user_id;

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

  delete from public.incident_reports where reported_by = p_user_id;

  update public.incident_reports
    set resolved_by = case when resolved_by = p_user_id then null else resolved_by end,
        resolved_by_name = case when resolved_by = p_user_id then null else resolved_by_name end,
        updated_at = now()
    where resolved_by = p_user_id;

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

grant execute on function public.delete_user_account(uuid) to authenticated, service_role;
