alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_by uuid references public.profiles(id);
alter table public.profiles add column if not exists created_by_name text;
alter table public.profiles add column if not exists position text;
alter table public.profiles add column if not exists status text not null default 'Active';

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := coalesce(nullif(trim(metadata->>'role'), ''), 'requestor');
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
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    branch = excluded.branch,
    department = excluded.department,
    position = excluded.position,
    created_by = excluded.created_by,
    created_by_name = excluded.created_by_name,
    status = excluded.status,
    role = excluded.role,
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
      when coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), 'requestor') = 'admin' then 'superadmin'
      when coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), 'requestor') = 'sacd_head' then 'department_head'
      when coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), 'requestor') in (
        'requestor',
        'branch_head',
        'department_head',
        'dpo',
        'ceo',
        'archivist',
        'superadmin'
      ) then coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), 'requestor')
      else 'requestor'
    end,
    coalesce(nullif(trim(u.raw_user_meta_data->>'status'), ''), 'Active') = 'Active'
  from auth.users u
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    branch = excluded.branch,
    department = excluded.department,
    position = excluded.position,
    created_by = excluded.created_by,
    created_by_name = excluded.created_by_name,
    status = excluded.status,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.handle_new_user();

do $$
begin
  perform public.sync_auth_users_to_profiles();
end $$ language plpgsql;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant execute on function public.get_my_role() to anon, authenticated, service_role;
grant execute on function public.is_superadmin() to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant select, insert, update on public.profiles to supabase_auth_admin;
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$ language plpgsql;
