drop policy if exists "requestors create own requests" on public.document_requests;
create policy "requestors create own requests" on public.document_requests for insert with check (
  requestor_id = auth.uid()
  and status in ('Draft', 'Pending Approval')
);
