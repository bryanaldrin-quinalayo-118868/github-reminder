# AGENTS.md — GitHub Reminder

> Living document describing the app's architecture, conventions, and best practices.
> Update this file as the project evolves.

---

## Overview

**GitHub Reminder** is a client-side React application for managing GitHub-related reminders. The project is in its **early/greenfield stage** — scaffolded from the Vite React-TS template with React Compiler enabled.

---

## Tech Stack

| Layer        | Technology                              | Version   |
| ------------ | --------------------------------------- | --------- |
| Runtime      | React                                   | 19.x      |
| Language     | TypeScript (strict)                     | ~5.9.3    |
| Bundler      | Vite                                    | 7.x       |
| Compiler     | React Compiler (via `babel-plugin-react-compiler`) | 1.x |
| Styling      | Tailwind CSS (v4, Vite plugin)          | 4.x       |
| UI Components| shadcn/ui + Radix UI primitives         | —         |
| Icons        | Lucide React                            | 0.575.x   |
| Utilities    | clsx + tailwind-merge (via `cn()`) + class-variance-authority | — |
| Linting      | ESLint 9 (flat config) + typescript-eslint + react-hooks + react-refresh | — |
| Module Type  | ESM (`"type": "module"`)                | —         |

### Key Notes

- **React Compiler** is enabled in `vite.config.ts` via Babel plugin. This auto-memoizes components — avoid manual `useMemo`/`useCallback` unless profiling proves it necessary.
- **Tailwind CSS v4** is integrated via the `@tailwindcss/vite` plugin — no `tailwind.config` file needed; configuration lives in `src/index.css` using `@theme inline`.
- **shadcn/ui** is set up with design tokens (oklch color space), dark mode support (`.dark` class strategy), and the `cn()` utility.
- **Path aliases** are configured: `@/*` maps to `./src/*` (see `tsconfig.json`).
- **No routing, state management, or data-fetching libraries** are installed yet.

---

## Project Structure

```
github-reminder/
├── public/               # Static assets served at root
│   └── vite.svg
├── src/
│   ├── assets/           # Importable static assets (images, SVGs)
│   │   └── react.svg
│   ├── components/
│   │   └── ui/           # shadcn/ui components (auto-generated, customizable)
│   │       └── button.tsx
│   ├── lib/
│   │   └── utils.ts      # cn() helper — clsx + tailwind-merge
│   ├── App.tsx           # Root application component
│   ├── App.css           # App-scoped styles (currently empty)
│   ├── main.tsx          # Entry point — renders <App /> into #root
│   └── index.css         # Tailwind v4 imports + shadcn theme tokens
├── index.html            # SPA shell — Vite entry
├── package.json
├── vite.config.ts        # Vite + React Compiler + Tailwind CSS config
├── tsconfig.json         # Project references root + path aliases
├── tsconfig.app.json     # App TypeScript config (strict, ES2022)
├── tsconfig.node.json    # Node/tooling TypeScript config
├── eslint.config.js      # ESLint flat config
└── AGENTS.md             # This file
```

### Directory Conventions

```
src/
├── components/
│   └── ui/               # shadcn/ui primitives — add via `npx shadcn@latest add <component>`
├── lib/                  # Shared utilities (cn(), future helpers)
├── features/             # Feature-based modules (co-locate components, hooks, types)
├── hooks/                # Shared custom hooks
├── services/             # API clients, external integrations (e.g., GitHub API)
├── types/                # Shared TypeScript types/interfaces
├── utils/                # Pure utility functions
├── stores/               # Global state (if Zustand or similar is added)
└── routes/               # Route definitions (if a router is added)
```

> **Note**: `components/ui/` is managed by shadcn/ui CLI. Customize generated components freely — they are not dependencies, they are your code.

---

## Scripts

| Command          | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `npm run dev`    | Start Vite dev server with HMR                |
| `npm run build`  | Type-check (`tsc -b`) then bundle for production |
| `npm run lint`   | Run ESLint across the project                 |
| `npm run preview`| Preview the production build locally           |

---

## TypeScript Configuration

- **Target**: ES2022
- **Strict mode**: Enabled (`strict: true`)
- **Unused code**: `noUnusedLocals` and `noUnusedParameters` enforced
- **Module resolution**: Bundler mode
- **Verbatim module syntax**: Enabled — use `import type` for type-only imports
- **Erasable syntax only**: Enabled — no enums or namespaces (use `as const` objects instead)

---

## Coding Conventions

### Components

- Export components as **default exports**.
- Use **function declarations** (not arrow functions) for components.
- Keep components in their own file, named in **PascalCase** (e.g., `ReminderCard.tsx`).

### TypeScript

- Prefer `type` over `interface` unless declaration merging is needed.
- Use `import type { ... }` for type-only imports (required by `verbatimModuleSyntax`).
- Avoid `enum` — use `as const` objects or union types instead (required by `erasableSyntaxOnly`).

### React Patterns

- **React Compiler is active** — do not manually wrap with `useMemo`, `useCallback`, or `React.memo` unless profiling shows the compiler's output is insufficient.
- Use `StrictMode` (already enabled in `main.tsx`).
- Prefer **controlled components** for form inputs.
- Co-locate related code: if a hook is only used by one component, keep it in the same file or feature folder.

### Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin — no config file, everything in `src/index.css`.
- **shadcn/ui design tokens** in `src/index.css` using oklch color space with `:root` (light) and `.dark` (dark) themes.
- **Dark mode**: Class-based (`.dark` on a parent element). Custom variant defined via `@custom-variant dark (&:is(.dark *))`.
- **`cn()` helper** (`src/lib/utils.ts`): Always use `cn()` for conditional/merged class names — it combines `clsx` and `tailwind-merge`.
- **CVA**: Use `class-variance-authority` for component variant definitions (see `button.tsx` for the pattern).
- **Do not use vanilla CSS** for new components — use Tailwind utility classes.

### Imports

- Keep imports organized: React → external libs → internal modules (`@/`) → styles.
- **Always use the `@/` path alias** for internal imports (e.g., `import { cn } from '@/lib/utils'`).

---

## Linting

ESLint 9 flat config with:

- **`@eslint/js`** recommended rules
- **`typescript-eslint`** recommended rules
- **`eslint-plugin-react-hooks`** — enforces Rules of Hooks
- **`eslint-plugin-react-refresh`** — ensures components are HMR-safe

Run `npm run lint` before committing.

---

## Architecture Decisions

### ADR-001: React Compiler

- **Status**: Adopted
- **Context**: React Compiler auto-memoizes components and hooks, reducing boilerplate and preventing stale-closure bugs from manual memoization.
- **Consequence**: Do not use `useMemo`, `useCallback`, or `React.memo` by default. The compiler handles it. Only add manual memoization if profiling proves a specific case is not optimized.
- **Trade-off**: Slightly slower dev/build times due to the Babel transform.

### ADR-002: Path Aliases

- **Status**: Adopted
- **Context**: `@/*` maps to `./src/*`, configured in `tsconfig.json`.
- **Consequence**: Always use `@/` for internal imports. Relative paths are acceptable only within the same directory.

### ADR-003: Tailwind CSS v4 + shadcn/ui

- **Status**: Adopted
- **Context**: Tailwind v4 uses a CSS-first configuration model — no `tailwind.config.ts`. The Vite plugin (`@tailwindcss/vite`) handles integration. shadcn/ui provides accessible, customizable UI primitives built on Radix UI.
- **Consequence**: Add new shadcn components via `npx shadcn@latest add <component>`. Customize freely — they live in `src/components/ui/`. Use `cn()` for class merging and CVA for variant patterns.
- **Theme**: Design tokens use oklch color space with CSS custom properties. Light/dark themes defined in `src/index.css`.

---

## Roadmap Considerations

These are areas to address as the app grows:

- [ ] **Routing** — Add `react-router` or `@tanstack/router` when multiple pages are needed.
- [ ] **State Management** — Consider Zustand or Jotai for global state.
- [ ] **Data Fetching** — Use TanStack Query for GitHub API integration with caching/retries.
- [x] **Styling** — Tailwind CSS v4 + shadcn/ui adopted.
- [ ] **Testing** — Add Vitest for unit tests and Playwright for E2E.
- [ ] **CI/CD** — Set up GitHub Actions for lint, type-check, test, and build.
- [ ] **Environment Variables** — Use Vite's `import.meta.env` with `.env` files for API keys.
- [x] **Path Aliases** — `@/*` alias configured in `tsconfig.json`.

---

## Contributing

1. Run `npm install` to set up dependencies.
2. Run `npm run dev` to start the dev server.
3. Run `npm run lint` before committing.
4. Update this `AGENTS.md` when introducing new patterns, libraries, or architectural changes.
