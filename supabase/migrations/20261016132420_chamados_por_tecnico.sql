-- Mantém o histórico completo para administradores e restringe cada técnico
-- aos chamados que ele abriu e às respostas da administração para esses chamados.
alter table public.observacoes_os
  add column if not exists chamado_origem_id uuid
  references public.observacoes_os(id) on delete set null;

create index if not exists idx_observacoes_chamado_origem
  on public.observacoes_os(chamado_origem_id)
  where chamado_origem_id is not null;

create or replace function public.resposta_de_chamado_do_usuario(origem uuid, usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.observacoes_os
    where id = origem and autor_id = usuario
  );
$$;

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
    join public.ordens_servico os on os.id = observacao.os_id
    where observacao.id = origem
      and observacao.os_id = ordem
      and observacao.autor_id = os.tecnico_id
  );
$$;

revoke all on function public.resposta_de_chamado_do_usuario(uuid, uuid) from public;
revoke all on function public.origem_e_chamado_do_tecnico(uuid, uuid) from public;
grant execute on function public.resposta_de_chamado_do_usuario(uuid, uuid) to authenticated;
grant execute on function public.origem_e_chamado_do_tecnico(uuid, uuid) to authenticated;

drop policy if exists "observacoes_select" on public.observacoes_os;
create policy "observacoes_select" on public.observacoes_os
for select to authenticated
using (
  public.is_admin()
  or autor_id = auth.uid()
  or public.resposta_de_chamado_do_usuario(chamado_origem_id, auth.uid())
);

drop policy if exists "observacoes_insert" on public.observacoes_os;
create policy "observacoes_insert" on public.observacoes_os
for insert to authenticated
with check (
  autor_id = auth.uid()
  and (
    (
      public.is_admin()
      and (
        chamado_origem_id is null
        or public.origem_e_chamado_do_tecnico(chamado_origem_id, os_id)
      )
    )
    or (
      not public.is_admin()
      and chamado_origem_id is null
      and exists (
        select 1 from public.ordens_servico os
        where os.id = os_id and os.tecnico_id = auth.uid()
      )
    )
  )
);

notify pgrst, 'reload schema';
