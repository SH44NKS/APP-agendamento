-- Central de pendencias, agenda e motivos padronizados
-- Execute uma unica vez no SQL Editor do Supabase.

alter table public.ordens_servico
  add column if not exists motivo_ocorrencia text,
  add column if not exists detalhe_ocorrencia text,
  add column if not exists ocorrencia_em timestamptz,
  add column if not exists ocorrencia_por uuid references public.profiles(id);

alter table public.ordens_servico drop constraint if exists ordens_servico_motivo_ocorrencia_check;
alter table public.ordens_servico add constraint ordens_servico_motivo_ocorrencia_check
check (motivo_ocorrencia is null or motivo_ocorrencia in (
  'cliente_ausente',
  'veiculo_indisponivel',
  'endereco_incorreto',
  'falta_equipamento',
  'cliente_solicitou',
  'problema_tecnico',
  'outro'
));

create index if not exists idx_os_agenda
  on public.ordens_servico(data_hora_agendada,tecnico_id)
  where data_hora_agendada is not null;

notify pgrst, 'reload schema';
