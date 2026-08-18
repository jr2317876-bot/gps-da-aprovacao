# GPS da Aprovação — Vercel + Supabase

Versão Next.js do planejador de estudos para residência médica, com autenticação e sincronização pelo Supabase.

## Antes de executar

1. No Supabase SQL Editor, execute os arquivos SQL de `supabase/` na ordem numérica.
   - Em um banco já existente, execute pelo menos `supabase/04-joao-weekly-cloud.sql`. Essa migração libera o escopo `joao_weekly_v1` que corrige o salvamento em nuvem do motor semanal do João.
2. Copie `.env.example` para `.env.local`.
3. Preencha apenas a Project URL e a Publishable key do Supabase.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Publicação na Vercel

Importe este repositório e cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em Settings > Environment Variables.

Nunca envie `.env.local`, senha do banco, secret key ou service role ao GitHub.

## Segurança dos dados do perfil João

- Cada alteração é gravada primeiro no navegador e depois sincronizada com a nuvem.
- Se a nuvem falhar, o aviso “Sincronização pendente” permite tentar novamente sem perder a cópia local.
- A política RLS usa o usuário autenticado e o `profile_id`, impedindo leitura ou alteração cruzada entre perfis.
- Tarefas, semanas, questões, simulados, revisões, indicações de flashcards e acompanhamentos possuem controles de edição ou exclusão com recálculo dos vínculos.
