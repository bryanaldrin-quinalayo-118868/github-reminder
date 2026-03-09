# AGENTS.md — GitHub Reminder

> Living document describing the app's architecture, conventions, and best practices.
> Update this file as the project evolves.

---

## Overview

**GitHub Reminder** is a client-side React application that tracks open pull requests across the `nelnet-nbs` daycare repositories. Users authenticate with their own GitHub Personal Access Token (per-user rate limits). It shows pending reviewers (with color-coded review status: pending, commented, changes requested), displays GitHub merge readiness status per PR, integrates Azure DevOps work item states with sprint info, and provides notification actions to ping reviewers via Teams. Users can schedule daily browser notifications summarizing their open PRs and review requests. Built on the Vite React-TS template with React Compiler enabled.

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
| Auth (GitHub)| Per-user PAT (localStorage)             | —         |
| Auth (Teams) | MSAL Browser (@azure/msal-browser)      | 4.x       |
| Notifications| Sonner (toast) + Web Notifications API  | —         |
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
- **Per-user GitHub auth**: Each user enters their own GitHub PAT on the login page. Token is stored in localStorage and used for all GitHub API calls, giving each user their own 5,000 requests/hour rate limit.
- **Environment variables** in `.env` (gitignored), see `env.example` for template:
  - `VITE_GITHUB_TOKEN` — Fallback GitHub PAT, used if no per-user token is stored.
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
│   │   ├── github-identity.ts # GitHub username localStorage persistence (legacy)
│   │   ├── msal.ts           # MSAL instance + scopes configuration
│   │   ├── notifications.ts  # Daily notification settings (time, enabled, filters)
│   │   ├── teams-settings.ts # Teams send mode/channel/chat localStorage settings
│   │   └── user-mappings.ts  # GitHub→Teams email mapping (GitHub repo + localStorage cache)
│   ├── features/
│   │   ├── auth/          # Authentication feature
│   │   │   └── LoginPage.tsx      # PAT-based login with setup instructions
│   │   └── dashboard/    # Main dashboard feature
│   │       ├── NotificationsDialog.tsx # Daily browser notification setup + scheduler
│   │       ├── PRTable.tsx        # PR table with filters, ADO pills, merge status, notify actions
│   │       ├── RepoSelector.tsx   # Repository dropdown selector
│   │       └── SettingsDialog.tsx  # Teams connection, GitHub account display
│   ├── hooks/
│   │   ├── useAllPullRequests.ts # TanStack Query hook — fetches open PRs across all repos
│   │   ├── usePullRequests.ts    # Wrapper hook — aggregates PR data with loading state
│   │   └── useRepos.ts           # TanStack Query hook for daycare repos
│   ├── lib/
│   │   └── utils.ts      # cn() helper — clsx + tailwind-merge
│   ├── services/
│   │   ├── ado.ts        # Azure DevOps REST API — work item states + color mapping
│   │   ├── github-auth.ts # GitHub auth — PAT storage, user fetch, logout
│   │   ├── github.ts     # GitHub REST API — repos, PRs, reviews, user-mappings file
│   │   └── graph.ts      # Microsoft Graph API — Teams channels, chats, messaging
│   ├── types/
│   │   └── github.ts     # Shared types (Repo, PullRequest, Reviewer, Review, AdoWorkItem)
│   ├── App.tsx           # Root — auth gate, header (logo reset, donate, theme, notifications, settings, logout), PRTable
│   ├── main.tsx          # Entry point — QueryClientProvider + Toaster + <App />
│   └── index.css         # Tailwind v4 imports + shadcn theme tokens
├── user-mappings.json    # Shared GitHub→Teams email mappings (committed to repo)
├── .env                  # Environment variables (gitignored) — see Key Notes
├── env.example           # Environment variable template (committed)
├── index.html            # SPA shell — Vite entry
├── package.json
├── vite.config.ts        # Vite + React Compiler + Tailwind CSS + path alias config
├── tsconfig.json         # Project references root + path aliases
├── tsconfig.app.json     # App TypeScript config (strict, ES2022)
├── tsconfig.node.json    # Node/tooling TypeScript config
├── .windsurf/
│   └── rules/
│       └── senior-react-developer.md  # Local AI rule — Senior React Developer persona
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
│   ├── auth/             # Authentication feature — LoginPage
│   └── dashboard/        # Dashboard feature — PRTable, NotificationsDialog, SettingsDialog
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

### ADR-005: GitHub API — Per-User PAT Authentication

- **Status**: Adopted (updated from shared PAT)
- **Context**: Originally used a single shared PAT (`VITE_GITHUB_TOKEN`), but with 10+ users all sharing 5,000 requests/hour, the rate limit would be exhausted within minutes. GitHub OAuth Device Flow was evaluated but requires org admin approval per user, which is impractical.
- **Consequence**: Each user enters their own GitHub PAT on a login page. The token is stored in localStorage and used for all API calls via `src/services/github-auth.ts`. Each user gets their own 5,000 requests/hour limit. `VITE_GITHUB_TOKEN` remains as a fallback. The login page includes step-by-step instructions and a direct link to GitHub's token creation page (pre-filled with `repo` scope).
- **Trade-off**: Users must manually create a PAT (one-time, ~2 min). No org approval needed since PATs use existing org membership.

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

### ADR-011: GitHub Merge Status via PR Detail Endpoint

- **Status**: Adopted
- **Context**: The PR list endpoint does not include `mergeable_state`. The individual PR detail endpoint (`GET /repos/{owner}/{repo}/pulls/{number}`) returns `mergeable`, `mergeable_state`, and `draft` fields.
- **Consequence**: An extra API call per PR is made in parallel with the reviews fetch. GitHub may return `mergeable_state: "unknown"` on first request while computing mergeability — the app retries once with a 1.5s delay. States displayed: `clean` (Ready), `blocked` (Blocked), `behind` (Behind), `dirty` (Conflicts), `unstable` (Unstable), `draft` (Draft), `unknown` (Pending with spinner).
- **Trade-off**: Roughly doubles per-PR API calls. Refetch interval increased from 5min to 10min to compensate.

### ADR-012: API Rate Limit Awareness

- **Status**: Adopted
- **Context**: Each user now has their own 5,000 requests/hour limit via per-user PATs. With ~15 repos, ~5 PRs each, and per-PR calls for reviews + merge status, individual usage is well within limits at 10-min intervals.
- **Consequence**: `src/services/github.ts` checks every response for 403/429 status and shows a toast with the rate limit reset time. Toast is debounced to once per 60 seconds to avoid spam. Refetch interval set to 10 minutes. TanStack Query caches all responses.

### ADR-013: Daily Browser Notifications

- **Status**: Adopted
- **Context**: Users want a daily summary of their PR status without keeping the tab visible.
- **Consequence**: `src/features/dashboard/NotificationsDialog.tsx` provides a UI to enable/disable notifications, set a time (default 13:00 PHT), and choose what to include (my PRs, review requests). A `setInterval` scheduler checks every 30 seconds and fires a Web Notification + in-app toast. Settings persist in localStorage (`gh-reminder:notification-settings`). Only available when GitHub username is configured.

### ADR-014: Logo Click Resets All Filters

- **Status**: Adopted
- **Context**: Users need a quick way to reset all filters and sorts in the PR table.
- **Consequence**: Clicking the PR Reminder logo/title in the header increments a `resetKey` counter in `App.tsx`. This key is passed as the React `key` prop on `PRDataTable`, forcing a full remount and resetting all `useState` values (view segment, filters, idle sort) to defaults. This avoids React Compiler lint issues with `setState` in effects.

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
- [x] **Merge Status Column** — GitHub `mergeable_state` displayed per PR with color-coded badges.
- [x] **Sprint Filter** — Filter PRs by ADO work item sprint.
- [x] **Rate Limit Detection** — Toast notification on 403/429 GitHub API responses.
- [x] **Daily Browser Notifications** — Scheduled PR summary via Web Notifications API.
- [x] **Logo Reset** — Click PR Reminder logo to reset all filters and sorts.
- [x] **Donate Dialog** — Easter egg joke dialog.
- [x] **Max Width Cap** — 1920px max width for ultra-wide monitors.
- [x] **Reviewer Name Truncation** — Shortened display names with full name on hover.
- [x] **Per-User PAT Auth** — Each user signs in with their own GitHub PAT; login page with instructions.
- [x] **Auto-Detect GitHub Username** — Username auto-set from authenticated user, no manual selection needed.
- [x] **Logout** — Sign out button in header clears token and returns to login page.
- [ ] **Browser Widget** — Convert to a Chrome/Edge extension for quick access.

---

## AI Workflow — Planning Mode for Big Changes

When implementing significant features, refactors, or architectural changes, **always enter planning mode first**:

1. **Analyze** the change and its impact on the codebase.
2. **Propose at least 2 options**, each with clear **pros and cons**.
3. **Wait for the user to pick** which option to proceed with before writing any code.

A change is considered "big" if it:
- Touches 3+ files or introduces a new pattern.
- Changes data flow, state management, or API layer.
- Adds a new dependency or architectural concept.
- Could reasonably be implemented in more than one way.

Small, obvious changes (bug fixes, styling tweaks, single-file edits) can proceed directly.

---

## Contributing

1. Copy `env.example` to `.env` and fill in the values.
2. Run `npm install` to set up dependencies.
3. Run `npm run dev` to start the dev server.
4. Create a GitHub PAT with `repo` scope and enter it on the login page.
5. Run `npm run lint` before committing.
6. Update this `AGENTS.md` when introducing new patterns, libraries, or architectural changes.
