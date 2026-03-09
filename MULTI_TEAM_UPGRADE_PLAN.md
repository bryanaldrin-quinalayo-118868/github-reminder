# Multi-Team Upgrade Plan

> Future upgrade plan for when teams beyond Daycare adopt PR Reminder.
> Covers customizable repos, user mappings, and per-team configuration.

---

## 1. Configurable Organization & Repo Watchlist

### Current state

- `src/services/github.ts` hardcodes `ORG = 'nelnet-nbs'` and `REPO_PREFIX = 'daycare-'`
- `src/hooks/useRepos.ts` calls `fetchDaycareRepos()` — name and logic assume daycare only
- `App.tsx` displays "Daycare repositories" as the subtitle

### Target

Each user picks which org + repos (or repo prefix) to watch.

### Changes

| File | What to do |
|------|------------|
| **New: `src/config/watchlist.ts`** | localStorage-backed config: `{ org: string; repoFilter: 'prefix' \| 'explicit'; prefix?: string; repos?: string[] }` with defaults matching current behavior |
| `src/services/github.ts` | `fetchDaycareRepos()` → `fetchWatchedRepos(config)`. Accept org + filter params instead of reading constants. Remove `ORG` / `REPO_PREFIX` constants |
| `src/hooks/useRepos.ts` | Read watchlist config, pass to `fetchWatchedRepos()`. Update query key to include org + filter so cache is per-config |
| `App.tsx` | Replace hardcoded subtitle with `config.org` / friendly label |
| **New: `src/features/dashboard/WatchlistDialog.tsx`** | Settings UI — org input, toggle between prefix filter vs. explicit repo multi-select (fetched from org). Save to localStorage. Show current watch count |

### UX sketch

```
┌─ Watchlist Settings ───────────────────┐
│ Organization:  [nelnet-nbs         ]   │
│                                        │
│ ○ Filter by prefix: [daycare-    ]     │
│ ● Pick repos manually:                 │
│   ☑ daycare-api                        │
│   ☑ daycare-web                        │
│   ☐ some-other-repo                    │
│                                        │
│ [Save]                                 │
└────────────────────────────────────────┘
```

---

## 2. Per-Team User Mappings

### Current state

- `src/config/user-mappings.ts` reads/writes a single `user-mappings.json` committed to `bryanaldrin-quinalayo-118868/github-reminder`
- All users share one flat `{ githubUsername: teamsEmail }` file
- Requires a GitHub PAT with write access to that specific repo

### Problems at scale

- One shared file = merge conflicts when multiple teams edit simultaneously
- New teams can't write to another user's repo without collaborator access
- No team-scoped isolation

### Options

| Option | Effort | Tradeoffs |
|--------|--------|-----------|
| **A. Per-org mappings file** | Low | Each org keeps its own `user-mappings.json` in a designated repo (e.g. `.github` repo). Config stores `{ mappingsOrg, mappingsRepo }`. Still file-based, still needs write access |
| **B. localStorage-only** | Minimal | Each user maintains their own mappings locally. No shared source of truth. New users must manually enter mappings |
| **C. Supabase table** | Medium | `user_mappings(github_username, teams_email, org)` table. No repo write access needed. Shared + real-time. Requires Supabase project |

### Recommendation

**Start with Option A** (low effort, no new infra). Each team sets their mappings repo in the watchlist config. Migrate to Option C only if the number of users makes file-based editing painful.

### Changes for Option A

| File | What to do |
|------|------------|
| `src/config/user-mappings.ts` | Replace hardcoded `OWNER`/`REPO` with values from watchlist config. `fetchMappings(org, repo)` / `saveMappings(org, repo, data)` |
| `src/config/watchlist.ts` | Add `mappingsRepo?: string` field (defaults to the `github-reminder` repo or a `.github` convention) |
| `WatchlistDialog.tsx` | Add optional "Mappings repo" input |

---

## 3. Settings Portability

### Current state

All config is in localStorage under separate keys:
- `gh-reminder:notification-settings`
- `gh-reminder:teams-settings`
- `gh-reminder:user-mappings` (cache)
- GitHub PAT + user object

### Problem

Switching browsers/devices = re-enter everything.

### Future option

Add an **Export / Import settings** button (JSON blob download/upload). Cheap to implement, no backend needed.

| File | What to do |
|------|------------|
| **New: `src/config/export-import.ts`** | `exportSettings(): string` (JSON of all localStorage keys with `gh-reminder:` prefix), `importSettings(json: string)` |
| `SettingsDialog.tsx` | Add Export / Import buttons |

---

## 4. Hardcoded Strings to Clean Up

| Location | Current value | Replace with |
|----------|---------------|--------------|
| `App.tsx:101` | `"Daycare repositories"` | Derived from watchlist config (`config.org` or custom label) |
| `App.tsx:129` | Teams link to `bryan.quinalayo@nelnetphilippines.com` | Remove or make configurable (e.g. link to a GitHub Issues page instead) |
| `src/services/github.ts:7-8` | `ORG`, `REPO_PREFIX` constants | Remove — read from watchlist config |
| `src/config/user-mappings.ts:3-4` | `OWNER`, `REPO` constants | Remove — read from watchlist config |
| `src/hooks/useRepos.ts:6` | Query key `'daycare'` | Dynamic key from config |

---

## 5. Implementation Order

```
Phase 1 — Watchlist config (unblocks other teams)
  1. Create watchlist.ts config module
  2. Refactor github.ts to accept org/filter params
  3. Update useRepos.ts + useAllPullRequests.ts query keys
  4. Build WatchlistDialog.tsx
  5. Wire into App.tsx header

Phase 2 — User mappings per team
  6. Parameterize user-mappings.ts with org/repo from config
  7. Add mappings repo field to WatchlistDialog

Phase 3 — Polish
  8. Export/Import settings
  9. Clean up hardcoded strings
 10. Update AGENTS.md with new architecture
```

---

## 6. Migration

Existing daycare users should see zero change on upgrade:
- Watchlist defaults to `{ org: 'nelnet-nbs', repoFilter: 'prefix', prefix: 'daycare-' }`
- Mappings default to current `bryanaldrin-quinalayo-118868/github-reminder`
- Only users who open the new Watchlist dialog and change values get different behavior
