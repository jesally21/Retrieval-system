create or replace function public.create_document_request(p_request jsonb)
returns public.document_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  p_request := p_request - 'id';
  return public.save_document_request(p_request);
end;
$$;

grant execute on function public.create_document_request(jsonb) to authenticated, service_role;
