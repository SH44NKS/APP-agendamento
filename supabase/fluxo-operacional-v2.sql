-- APP agendamento | Fluxo operacional v2
-- Execute este arquivo uma unica vez no SQL Editor do Supabase.

-- O trigger antigo depende do tipo da coluna status. Ele precisa ser removido
-- durante a conversao e sera recriado ao final desta migracao.
drop trigger if exists trg_historico_os on public.ordens_servico;

-- Substitui o enum antigo preservando e convertendo registros existentes.
alter table public.ordens_servico alter column status drop default;
alter table public.ordens_servico alter column status type text using status::text;

update public.ordens_servico set status='aguardando_retorno' where status='pendente';
update public.ordens_servico set status='finalizado' where status='concluido';

drop type if exists public.status_os;
create type public.status_os as enum (
  'aguardando_retorno',
  'agendado',
  'reagendar',
  'concluido_tecnico',
  'finalizado',
  'cancelado'
);

alter table public.ordens_servico
  alter column status type public.status_os using status::public.status_os;
alter table public.ordens_servico
  alter column status set default 'aguardando_retorno'::public.status_os;

-- Recria o historico depois que o novo enum ja esta ativo.
create or replace function public.registrar_historico_os()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare detalhes jsonb;
begin
  if tg_op='INSERT' then
    detalhes=jsonb_build_object('status_novo',new.status,'tecnico_novo',new.tecnico_id);
  else
    detalhes=jsonb_strip_nulls(jsonb_build_object(
      'status_anterior',old.status,
      'status_novo',new.status,
      'tecnico_anterior',old.tecnico_id,
      'tecnico_novo',new.tecnico_id,
      'data_hora_agendada',new.data_hora_agendada
    ));
  end if;
  insert into public.historico_os(os_id,usuario_id,acao,detalhes)
  values(new.id,auth.uid(),lower(tg_op),detalhes);
  return new;
end;
$$;

create trigger trg_historico_os
after insert or update on public.ordens_servico
for each row execute function public.registrar_historico_os();

-- Datas separadas para conclusao do tecnico e finalizacao administrativa.
alter table public.ordens_servico
  add column if not exists concluido_tecnico_em timestamptz;
alter table public.ordens_servico
  add column if not exists finalizado_em timestamptz;

update public.ordens_servico
set finalizado_em=coalesce(finalizado_em,concluido_em)
where status='finalizado';

-- Observacoes funcionam como chamados vinculados a OS.
create table if not exists public.observacoes_os (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  autor_id uuid not null references public.profiles(id),
  texto text not null check (length(trim(texto)) between 1 and 2000),
  visto_admin_em timestamptz,
  visto_admin_por uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_observacoes_os_os on public.observacoes_os(os_id,criado_em desc);
create index if not exists idx_observacoes_pendentes on public.observacoes_os(visto_admin_em,criado_em desc);

-- Impede que um tecnico finalize administrativamente ou altere os dados-base da OS.
create or replace function public.proteger_edicao_os_tecnico()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if public.is_admin() then return new; end if;
  if old.tecnico_id is distinct from auth.uid() then
    raise exception 'Sem permissao para alterar esta OS';
  end if;
  if new.status in ('finalizado','cancelado') then
    raise exception 'Somente administradores podem finalizar esta OS';
  end if;
  if new.tipo is distinct from old.tipo
    or new.prioridade is distinct from old.prioridade
    or new.cliente_nome is distinct from old.cliente_nome
    or new.veiculo_modelo is distinct from old.veiculo_modelo
    or new.veiculo_identificador is distinct from old.veiculo_identificador
    or new.telefone is distinct from old.telefone
    or new.local is distinct from old.local
    or new.tecnico_id is distinct from old.tecnico_id
    or new.consultor_nome is distinct from old.consultor_nome
    or new.observacoes is distinct from old.observacoes then
    raise exception 'Somente administradores podem editar os dados da OS';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_edicao_os_tecnico on public.ordens_servico;
create trigger trg_proteger_edicao_os_tecnico
before update on public.ordens_servico
for each row execute function public.proteger_edicao_os_tecnico();

alter table public.observacoes_os enable row level security;

drop policy if exists "observacoes_select" on public.observacoes_os;
create policy "observacoes_select" on public.observacoes_os
for select to authenticated
using (
  public.is_admin()
  or autor_id=auth.uid()
  or exists (
    select 1 from public.ordens_servico o
    where o.id=os_id and o.tecnico_id=auth.uid()
  )
);

drop policy if exists "observacoes_insert" on public.observacoes_os;
create policy "observacoes_insert" on public.observacoes_os
for insert to authenticated
with check (
  autor_id=auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1 from public.ordens_servico o
      where o.id=os_id and o.tecnico_id=auth.uid()
    )
  )
);

drop policy if exists "observacoes_admin_update" on public.observacoes_os;
create policy "observacoes_admin_update" on public.observacoes_os
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "observacoes_admin_delete" on public.observacoes_os;
create policy "observacoes_admin_delete" on public.observacoes_os
for delete to authenticated
using (public.is_admin());

drop policy if exists "os_admin_delete" on public.ordens_servico;
create policy "os_admin_delete" on public.ordens_servico
for delete to authenticated
using (public.is_admin());

grant select,insert,update,delete on public.observacoes_os to authenticated;
notify pgrst, 'reload schema';
