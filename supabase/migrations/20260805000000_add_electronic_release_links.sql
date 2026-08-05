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

drop trigger if exists set_updated_at_electronic_release_links on public.electronic_release_links;
create trigger set_updated_at_electronic_release_links
before update on public.electronic_release_links
for each row execute function public.set_updated_at();

alter table public.electronic_release_links enable row level security;

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

grant select, insert, update, delete on public.electronic_release_links to authenticated, service_role;
grant execute on function public.save_electronic_release_link(uuid, jsonb) to authenticated, service_role;
