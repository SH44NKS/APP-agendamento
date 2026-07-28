-- APP agendamento | Ajuste v2.1
-- Reintroduz Pendente como status inicial. Execute uma unica vez.

-- Remove triggers que dependem do tipo atual da coluna.
do $$
declare item record;
begin
  for item in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid=t.tgfoid
    join pg_namespace n on n.oid=p.pronamespace
    where t.tgrelid='public.ordens_servico'::regclass
      and not t.tgisinternal
      and n.nspname='public'
      and p.proname in ('registrar_historico_os','proteger_edicao_os_tecnico')
  loop
    execute format('drop trigger if exists %I on public.ordens_servico',item.tgname);
  end loop;
end;
$$;

drop function if exists public.registrar_historico_os();
drop function if exists public.proteger_edicao_os_tecnico();

-- Status passa a ser texto controlado pelo aplicativo. Isso facilita futuras
-- evolucoes do fluxo sem novas substituicoes de enum.
alter table public.ordens_servico alter column status drop default;
alter table public.ordens_servico alter column status type text using status::text;
alter table public.ordens_servico alter column status set default 'pendente';

create or replace function public.registrar_historico_os()
returns trigger language plpgsql security definer set search_path=public as $$
declare detalhes jsonb;
begin
  if tg_op='INSERT' then
    detalhes=jsonb_build_object('status_novo',new.status,'tecnico_novo',new.tecnico_id);
  else
    detalhes=jsonb_strip_nulls(jsonb_build_object('status_anterior',old.status,'status_novo',new.status,'tecnico_anterior',old.tecnico_id,'tecnico_novo',new.tecnico_id,'data_hora_agendada',new.data_hora_agendada));
  end if;
  insert into public.historico_os(os_id,usuario_id,acao,detalhes) values(new.id,auth.uid(),lower(tg_op),detalhes);
  return new;
end;
$$;
create trigger trg_historico_os after insert or update on public.ordens_servico for each row execute function public.registrar_historico_os();

create or replace function public.proteger_edicao_os_tecnico()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.is_admin() then return new; end if;
  if old.tecnico_id is distinct from auth.uid() then raise exception 'Sem permissao para alterar esta OS'; end if;
  if new.status in ('finalizado','cancelado') then raise exception 'Somente administradores podem finalizar esta OS'; end if;
  if new.tipo is distinct from old.tipo or new.prioridade is distinct from old.prioridade or new.cliente_nome is distinct from old.cliente_nome or new.veiculo_modelo is distinct from old.veiculo_modelo or new.veiculo_identificador is distinct from old.veiculo_identificador or new.telefone is distinct from old.telefone or new.local is distinct from old.local or new.tecnico_id is distinct from old.tecnico_id or new.consultor_nome is distinct from old.consultor_nome or new.observacoes is distinct from old.observacoes then raise exception 'Somente administradores podem editar os dados da OS'; end if;
  return new;
end;
$$;
create trigger trg_proteger_edicao_os_tecnico before update on public.ordens_servico for each row execute function public.proteger_edicao_os_tecnico();

notify pgrst, 'reload schema';
