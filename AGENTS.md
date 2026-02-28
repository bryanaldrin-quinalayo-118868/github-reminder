# AGENTS.md — GitHub Reminder

> Living document describing the app's architecture, conventions, and best practices.
> Update this file as the project evolves.

---

## Overview

**GitHub Reminder** is a client-side React application that tracks open pull requests across the `nelnet-nbs` daycare repositories. It shows pending reviewers (those who haven't approved or commented), and provides notification actions to ping them via Teams. Built on the Vite React-TS template with React Compiler enabled.

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
| Data Fetching| TanStack React Query                    | 5.x       |
| Auth         | MSAL Browser (@azure/msal-browser)      | 4.x       |
| Notifications| Sonner (toast library)                  | —         |
| Utilities    | clsx + tailwind-merge (via `cn()`) + class-variance-authority | — |
| Linting      | ESLint 9 (flat config) + typescript-eslint + react-hooks + react-refresh | — |
| Module Type  | ESM (`"type": "module"`)                | —         |

### Key Notes

- **React Compiler** is enabled in `vite.config.ts` via Babel plugin. This auto-memoizes components — avoid manual `useMemo`/`useCallback` unless profiling proves it necessary.
- **Tailwind CSS v4** is integrated via the `@tailwindcss/vite` plugin — no `tailwind.config` file needed; configuration lives in `src/index.css` using `@theme inline`.
- **shadcn/ui** is set up with design tokens (oklch color space), dark mode support (`.dark` class strategy), and the `cn()` utility.
- **Path aliases** are configured: `@/*` maps to `./src/*` (see `tsconfig.json`).
- **TanStack React Query** is used for data fetching with caching/stale-time management.
- **Sonner** provides toast notifications (success/warning/info).
- **MSAL** is configured for Azure AD OAuth2 with incremental consent. Used for Teams messaging (channel and chat).
- **Azure DevOps** integration fetches work item statuses via REST API with a PAT.
- **Environment variables** in `.env` (gitignored):
  - `VITE_GITHUB_TOKEN` — GitHub PAT for repo/PR access.
  - `VITE_MSAL_CLIENT_ID` — Azure AD app registration client ID.
  - `VITE_MSAL_TENANT_ID` — Azure AD tenant ID.
  - `VITE_ADO_PAT` — Azure DevOps PAT with **Work Items (Read)** scope.

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
│   ├── config/
│   │   ├── msal.ts           # MSAL instance + scopes configuration
│   │   ├── teams-settings.ts # Teams send mode/channel/chat localStorage settings
│   │   └── user-mappings.ts  # GitHub→Teams email mapping (GitHub repo + localStorage cache)
│   ├── features/
│   │   └── dashboard/    # Main dashboard feature
│   │       ├── PRTable.tsx        # PR table with filters, ADO pills, notify actions
│   │       ├── RepoSelector.tsx   # Repository dropdown selector
│   │       └── SettingsDialog.tsx  # Teams connection, send mode, user mappings
│   ├── hooks/
│   │   ├── usePullRequests.ts  # TanStack Query hook for open PRs
│   │   └── useRepos.ts         # TanStack Query hook for daycare repos
│   ├── lib/
│   │   └── utils.ts      # cn() helper — clsx + tailwind-merge
│   ├── services/
│   │   ├── ado.ts        # Azure DevOps REST API — work item states + color mapping
│   │   ├── github.ts     # GitHub REST API — repos, PRs, reviews, user-mappings file
│   │   └── graph.ts      # Microsoft Graph API — Teams channels, chats, messaging
│   ├── types/
│   │   └── github.ts     # Shared types (Repo, PullRequest, Reviewer, Review, AdoWorkItem)
│   ├── App.tsx           # Root application component — dashboard layout
│   ├── main.tsx          # Entry point — QueryClientProvider + Toaster + <App />
│   └── index.css         # Tailwind v4 imports + shadcn theme tokens
├── user-mappings.json    # Shared GitHub→Teams email mappings (committed to repo)
├── .env                  # Environment variables (gitignored) — see Key Notes
├── index.html            # SPA shell — Vite entry
├── package.json
├── vite.config.ts        # Vite + React Compiler + Tailwind CSS + path alias config
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
├── config/               # App configuration (MSAL, Teams settings, user mappings)
├── features/             # Feature-based modules (co-locate components, hooks, types)
│   └── dashboard/        # Dashboard feature — RepoSelector, PRTable
├── hooks/                # Shared custom hooks (TanStack Query wrappers)
├── lib/                  # Shared utilities (cn(), future helpers)
├── services/             # API clients (GitHub, Azure DevOps, Microsoft Graph)
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

### ADR-004: TanStack React Query for Data Fetching

- **Status**: Adopted
- **Context**: GitHub API calls need caching, stale-time management, and loading/error states.
- **Consequence**: All data fetching goes through TanStack Query hooks in `src/hooks/`. `QueryClientProvider` wraps the app in `main.tsx`. Use `staleTime` to control refetch frequency.

### ADR-005: GitHub API — Client-Side with PAT

- **Status**: Adopted
- **Context**: The app is fully client-side. GitHub REST API is called directly from the browser using a Personal Access Token stored in `VITE_GITHUB_TOKEN`.
- **Consequence**: The token is embedded in the client bundle — acceptable for internal team tooling, not for public-facing apps. Service layer lives in `src/services/github.ts`.

### ADR-006: Feature-Based Module Structure

- **Status**: Adopted
- **Context**: Co-locating feature components keeps related code together and reduces import sprawl.
- **Consequence**: Each feature gets a folder under `src/features/` (e.g., `dashboard/`). Components, hooks, and types specific to a feature live inside that folder.

### ADR-007: MSAL for Teams Notifications

- **Status**: Adopted
- **Context**: The app sends PR review reminders via Microsoft Teams. MSAL Browser handles OAuth2 with Azure AD, supporting incremental consent for Graph API scopes (`Team.ReadBasic.All`, `Channel.ReadBasic.All`, `ChannelMessage.Send`, `Chat.ReadWrite`).
- **Consequence**: `src/config/msal.ts` exports the singleton instance. `src/services/graph.ts` handles token acquisition and Graph API calls. Settings (send mode, team/channel/chat) are persisted in localStorage.

### ADR-008: Azure DevOps Work Item Integration

- **Status**: Adopted
- **Context**: PRs often reference ADO work items in their description. The app parses these links, batch-fetches their states from the ADO REST API, and displays them as colored status pills.
- **Consequence**: `src/services/ado.ts` handles ADO API calls. `VITE_ADO_PAT` is required. ADO fetch is non-blocking — if the PAT is missing or invalid, PRs still load without work item data.

### ADR-009: Shared User Mappings via GitHub Repo File

- **Status**: Adopted
- **Context**: GitHub username → Teams email mappings need to be shared across team members. The mappings JSON file (`user-mappings.json`) lives in the repo root and is read/written via the GitHub Contents API.
- **Consequence**: On app startup, mappings are fetched from GitHub and cached in localStorage. The SettingsDialog allows editing and saving (commits to repo). `src/config/user-mappings.ts` manages the read/write/cache lifecycle.

### ADR-010: Avoid Radix UI Inside Frequently Re-rendering Contexts

- **Status**: Adopted
- **Context**: Radix Select (used by shadcn/ui `<Select>`) causes freezes when used inside components that re-render on filter state changes, especially with React Compiler enabled.
- **Consequence**: Use native `<select>` elements for filter dropdowns in the PR table. Radix/shadcn Select is fine in low-frequency contexts like dialogs.

---

## Roadmap Considerations

These are areas to address as the app grows:

- [ ] **Routing** — Add `react-router` or `@tanstack/router` when multiple pages are needed.
- [ ] **State Management** — Consider Zustand or Jotai for global state.
- [x] **Data Fetching** — TanStack React Query adopted for GitHub API integration.
- [x] **Styling** — Tailwind CSS v4 + shadcn/ui adopted.
- [ ] **Testing** — Add Vitest for unit tests and Playwright for E2E.
- [ ] **CI/CD** — Set up GitHub Actions for lint, type-check, test, and build.
- [x] **Environment Variables** — `VITE_GITHUB_TOKEN` in `.env` (gitignored).
- [x] **Path Aliases** — `@/*` alias configured in `tsconfig.json` + `vite.config.ts`.
- [x] **Teams Integration** — MSAL + Graph API for channel and chat messaging.
- [x] **ADO Integration** — Work item status pills parsed from PR descriptions.
- [x] **Shared User Mappings** — GitHub repo JSON file as source of truth.
- [ ] **Browser Widget** — Convert to a Chrome/Edge extension for quick access.

---

## Contributing

1. Run `npm install` to set up dependencies.
2. Run `npm run dev` to start the dev server.
3. Run `npm run lint` before committing.
4. Update this `AGENTS.md` when introducing new patterns, libraries, or architectural changes.
