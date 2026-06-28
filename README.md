# UX Recall — interní e-commerce / UX newsletter agent

Týdenní agent, který z allowlistu CZ e-commerce/UX zdrojů sestaví a rozešle týmu digest,
a vede stavový legislativní tracker s událostně řízenými upozorněními.

## Architektura

- **Doménové jádro** (`src/domain/`) — legislativní engine (T-minus, suppression), inkluzní rubrika, skládání digestu, render. Čistá logika, bez závislosti na službách.
- **Adaptéry** (`src/adapters/`) — Supabase (úložiště), zdroje (RSS/HTML), klasifikace (Claude Haiku 4.5), e-mail (Resend). Rozhraní + `*.live.ts` produkční implementace.
- **Pipeliny** (`src/pipeline/`) — `build` (neděle: sběr→klasifikace→event-logika→draft→heartbeat), `send` (pondělí: rozeslání).
- **Admin UI** (`app/`) — Next.js + shadcn (auth, tracker, kandidáti/merge view, příjemci, zdroje). *(ve výstavbě)*

## Běh agenta

```bash
npm install
npm test           # 50 jednotkových testů
npm run typecheck

# ostrý běh (potřebuje .env, viz .env.example)
npm run agent:build   # nedělní sestavení digestu
npm run agent:send    # pondělní rozeslání
```

Cron běží přes GitHub Actions (`.github/workflows/`). Schéma DB: `supabase/migrations/`, seed: `supabase/seed.sql`.

## Konfigurace

Zkopíruj `.env.example` → `.env` a doplň klíče (Supabase, Anthropic, Resend). `.env` se necommituje.
