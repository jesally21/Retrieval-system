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
