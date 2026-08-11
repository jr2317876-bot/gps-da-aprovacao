# GPS da Aprovação — Vercel + Supabase

Versão Next.js do planejador de estudos para residência médica, com autenticação e sincronização pelo Supabase.

## Antes de executar

1. No Supabase SQL Editor, execute `supabase/03-profile-states.sql`.
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
