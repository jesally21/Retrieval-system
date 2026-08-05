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
    elsif p_requestor_role in ('department_head', 'dpo', 'ceo') then
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
    if approver_profile.id is null then
      select *
        into approver_profile
        from public.profiles
        where role = 'branch_head' and is_active = true
        order by created_at asc
        limit 1;
    end if;
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
