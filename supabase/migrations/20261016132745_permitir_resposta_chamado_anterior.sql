-- A administração pode responder a chamados de técnicos anteriores.
-- A resposta permanece visível apenas para o técnico que abriu aquele chamado.
create or replace function public.origem_e_chamado_do_tecnico(origem uuid, ordem uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.observacoes_os observacao
    join public.profiles tecnico on tecnico.id = observacao.autor_id
    where observacao.id = origem
      and observacao.os_id = ordem
      and tecnico.papel = 'tecnico'
  );
$$;
