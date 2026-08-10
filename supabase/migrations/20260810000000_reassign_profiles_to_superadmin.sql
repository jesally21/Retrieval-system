create or replace function public.reassign_profiles_to_superadmin(p_superadmin_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  superadmin_profile public.profiles%rowtype;
  updated_count integer := 0;
begin
  if not (public.is_superadmin() or auth.role() = 'service_role') then
    raise exception 'Forbidden.';
  end if;

  select *
    into superadmin_profile
  from public.profiles
  where id = p_superadmin_id
    and role = 'superadmin';

  if not found then
    raise exception 'Super admin profile not found.';
  end if;

  update public.profiles
    set created_by = p_superadmin_id,
        created_by_name = superadmin_profile.full_name,
        updated_at = now()
    where id <> p_superadmin_id
      and role <> 'superadmin';

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.reassign_profiles_to_superadmin(uuid) to authenticated, service_role;
