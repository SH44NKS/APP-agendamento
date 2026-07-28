-- Execute este arquivo PRIMEIRO quando o banco já foi criado pela versão inicial.
-- Depois execute supabase/schema.sql completo.

alter table public.profiles
  add column if not exists ativo boolean;

update public.profiles
set ativo = true
where ativo is null;

alter table public.profiles
  alter column ativo set default true;

alter table public.profiles
  alter column ativo set not null;

alter table public.ordens_servico
  add column if not exists observacoes text;

alter table public.ordens_servico
  add column if not exists criado_por uuid references public.profiles(id);

alter table public.ordens_servico
  add column if not exists cancelado_em timestamptz;

-- Confirma visualmente que a coluna foi criada antes do schema principal.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'ativo';
