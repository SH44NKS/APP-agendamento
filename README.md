# Foco & Escudo — Agendamento de Serviços

Aplicação para controlar ordens de instalação, retirada e manutenção. Administradores acompanham toda a operação; cada técnico visualiza somente os próprios serviços.

## Funcionalidades

- Login Google via Supabase, com papéis `admin` e `tecnico`.
- Dashboard geral, busca por cliente/placa/chassi/local e filtros por status, serviço e técnico.
- Alertas por tempo em aberto (amarelo e vermelho configuráveis no banco).
- Relatório por técnico com volume e tempos médios.
- Fluxo da OS: pendente → agendada → concluída, além de cancelamento.
- WhatsApp com mensagem profissional preenchida automaticamente.
- Agendamento no Google Agenda do técnico.
- Reatribuição de técnico, histórico de alterações e exportação CSV.
- Segurança RLS: técnico acessa somente OS atribuídas a ele.

## Configuração obrigatória

### 1. Banco Supabase

No painel do Supabase, abra **SQL Editor**, crie uma nova consulta, cole todo o arquivo `supabase/schema.sql` e clique em **Run**.

Depois do primeiro login, promova os gestores em **Table Editor → profiles**, alterando `papel` de `tecnico` para `admin`. Faça isso somente para os 4–5 e-mails da gestão.

### 2. Login Google e Agenda

No Google Cloud Console:

1. Ative a **Google Calendar API**.
2. Configure a tela de consentimento OAuth.
3. No cliente OAuth, adicione a URL de callback exibida em **Supabase → Authentication → Providers → Google**.
4. No Supabase, ative o provedor Google e informe Client ID e Client Secret.
5. Em **Authentication → URL Configuration**, defina a URL da Vercel como Site URL e adicione `https://SEU-DOMINIO.vercel.app/auth/callback` às Redirect URLs.

### 3. Variáveis da Vercel

Em **Vercel → app-agendamento → Settings → Environment Variables**, configure nos ambientes Production, Preview e Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.vercel.app
GOOGLE_CLIENT_ID=SEU_CLIENT_ID
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET
POWERCRM_TOKEN_FOCO=TOKEN_PRIVADO_DO_CRM_FOCO
POWERCRM_TOKEN_ESCUDO=TOKEN_PRIVADO_DO_CRM_ESCUDO
```

Não use a chave `service_role` no navegador. Depois de salvar as variáveis, faça um redeploy.

As variáveis `POWERCRM_TOKEN_FOCO` e `POWERCRM_TOKEN_ESCUDO` são usadas apenas pela busca CRM ao criar uma OS. Como alternativa, o APP também aceita a mesma ponte já usada pelo Sistema de Rastreamento A&O: defina `POWERCRM_BRIDGE_URL` e `POWERCRM_BRIDGE_SECRET`. Cadastre tokens e segredos como **Secret** na Vercel; eles nunca devem ter o prefixo `NEXT_PUBLIC_` nem ser incluídos no GitHub.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha com valores reais. Nunca envie `.env.local` ao GitHub.
