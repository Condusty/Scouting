# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Volleyball scouting desktop app — a VolleyStation clone. Electron + React + TypeScript + Vite + SQLite (better-sqlite3). Offline-first, single local DB file. Built in phases; see `docs/specs/tech-spec.md` (source of truth for schema/IPC/types) and `docs/superpowers/specs/` (per-phase design docs). `WORKFLOW.md` defines the skill sequence and roadmap.

## Commands

```bash
npm run dev          # electron-vite dev (HMR, opens Electron window + DevTools)
npm run build        # electron-vite build && electron-builder (package app)
npm test             # vitest run — all unit tests
npm run test:e2e     # playwright (Electron E2E)
npx vitest run tests/unit/<file>.test.ts   # single test file
npx vitest           # watch mode
```

Unit tests live in `tests/unit/`, run in the `node` environment (see `vitest.config.mts`) — they exercise pure logic and main-process code (DB via in-memory SQLite), never the renderer DOM.

## Architecture

Three process boundaries — respect them; data crosses only via IPC:

- **`src/main/`** — Electron main (Node). Owns SQLite. Exposes typed IPC handlers. The renderer has **no** DB access.
- **`src/preload/index.ts`** — contextBridge. Exposes exactly one thing: `window.ipc.invoke<T>(channel, data)`. Everything renderer↔main goes through it.
- **`src/renderer/`** — React app (browser context). Calls main through `api/*.api.ts` wrappers, never `ipcRenderer` directly.
- **`src/shared/`** — types + IPC channel constants imported by both sides. Single source of truth for the wire contract.

**IPC flow (follow this pattern for every new feature):**
`shared/ipc-channels.ts` (add channel const) → `main/ipc/<x>.ipc.ts` (`ipcMain.handle`, talks to DB) → register in `main/ipc/registry.ts` → `renderer/api/<x>.api.ts` (typed `window.ipc.invoke` wrapper) → `renderer/store/<x>.store.ts` (Zustand) → components. Handlers do validation and return clean errors, not raw SQLite errors.

**Database:** `main/db/connection.ts` is a lazy singleton (`getDb()`), WAL + `foreign_keys = ON`, dev DB at `scouting.dev.db` in cwd, packaged DB in `userData`. Schema changes = **new sequential migration file** in `main/db/migrations/` (e.g. `002_*.sql`) registered in `main/db/migrate.ts`; migrations are idempotent and tracked in the `migrations` table. Never edit `001_initial.sql` after it ships — add a migration.

**State:** Zustand stores in `renderer/store/`. `ui.store.ts` drives the browser-like tab shell (`features/layout/TabBar` + `Sidebar`); every screen opens as a `Tab`. Feature state (matches, scouting, etc.) lives in its own store.

**Feature code** is grouped by domain under `renderer/features/<domain>/`. Pure business logic (code parser, validator, scoring, stats engine) goes in `renderer/lib/` as framework-free TS so it can be unit-tested in isolation — this logic is **TDD-first** (write the test before the implementation; it's the highest-risk code in the app).

**Path aliases:** `@shared/*`, `@renderer/*` (configured in `tsconfig.json`, `electron.vite.config.ts`, and `vitest.config.mts` — keep all three in sync).

## Domain notation

Live scouting uses DataVolley/VolleyStation-style codes (e.g. `a10SQ#15` = away player 10, jump serve, ace, zone 1→5). The parser grammar and per-phase scope are defined in the active phase design doc under `docs/superpowers/specs/`. Match that doc — do not invent notation. Keep DVW (`.dvw`) compatibility in mind: the schema already carries the fields, even where a phase doesn't use them yet.

## UI standard (non-negotiable)

This app must look clean, modern, and professional — like commercial sports software, not a default HTML form.

- **No naked/default-styled controls.** No bare `<button>`, `<input>`, `<select>` with browser styling. Build/reuse styled components via Tailwind + shadcn/ui. Consistent spacing, radius, focus states.
- **Design system, not one-offs.** Reuse shared primitives; don't restyle the same control five different ways. Dark theme is the baseline (see `features/layout/`).
- **Considered interactions.** Hover/active/disabled/focus states, sensible empty states, keyboard-friendly (this is a keyboard-heavy scouting tool). `-webkit-app-region: drag` is set on `body`; interactive elements must stay `no-drag` (already handled in `styles/index.css`).
- **Density with clarity.** Scouting/reports screens are data-dense — favour compact, legible tables and grids over oversized cards. Use `lucide-react` for icons, `clsx`/`tailwind-merge` for class composition.

When in doubt, raise the visual bar. A feature that works but looks like an unstyled prototype is not done.

## Conventions

- Conventional Commits; one branch per phase/sub-area (e.g. `phase-1a-data-mgmt`).
- TypeScript `strict` is on. Shared wire types live in `src/shared/types.ts` — extend there, don't duplicate shapes per side.
