drop policy if exists "superadmin manage profiles" on public.profiles;
drop policy if exists "superadmin manage non-superadmin profiles" on public.profiles;
create policy "superadmin manage non-superadmin profiles" on public.profiles
  for all
  using (public.is_superadmin() and role <> 'superadmin')
  with check (public.is_superadmin() and role <> 'superadmin');
