# TeamSync Agent Guide

This file is for coding agents working in this repository.
It documents the current architecture, data flow, deployment model, and known pitfalls.

## 1) What This Project Is

TeamSync is a Next.js 16 App Router app for internal team collaboration with:

- Convex Auth (GitHub OAuth)
- Convex database/functions for app data
- Dashboard, tasks, budget, team, calendar, profile, docs
- Access levels (`admin`, `member`, `viewer`)
- Docker-based VPS deployment behind Nginx Proxy Manager

## 2) Tech Stack

- Next.js `16.1.6`
- React `19.2.3`
- TypeScript
- Tailwind CSS v4
- Convex `1.31.7`
- Convex Auth `@convex-dev/auth`
- Recharts `3.7.0`
- Radix/shadcn-style UI components in `components/ui`

## 3) High-Level Structure

```
app/
  layout.tsx                      # Root provider setup
  ConvexClientProvider.tsx
  login/page.tsx
  join/page.tsx
  (dashboard)/
    layout.tsx                    # AuthGuard + Sidebar/Task modal providers
    page.tsx
    tasks/page.tsx
    budget/page.tsx
    team/page.tsx
    calendar/page.tsx
    docs/page.tsx
    profile/page.tsx
    settings/page.tsx

components/
  AppLayout.tsx
  Sidebar.tsx
  Header.tsx
  AddTaskModal.tsx
  TaskModal.tsx
  AuthGuard.tsx
  OnboardingModal.tsx
  InviteMemberModal.tsx
  SidebarContext.tsx
  TaskModalContext.tsx
  ui/*

sections/
  Dashboard.tsx
  TaskBoard.tsx
  BudgetView.tsx
  TeamView.tsx
  CalendarView.tsx
  DocumentsView.tsx
  ProfileView.tsx
  SettingsView.tsx

convex/
  schema.ts
  auth.ts
  http.ts
  users.ts
  teamMembers.ts
  invites.ts
  tasks.ts
  budget.ts
  calendar.ts
  dashboard.ts
  documents.ts
  seed.ts
```

## 4) Routing and Auth

Protected app routes are under `app/(dashboard)/*`.

Server middleware in `middleware.ts`:
- redirects unauthenticated users away from protected routes to `/login`
- redirects authenticated users from `/login` to `/`

Client-side guard:
- `components/AuthGuard.tsx` wraps dashboard layout

Join flow:
- `/join?code=...` route drives invite redemption + onboarding

## 5) Provider Hierarchy

Root (`app/layout.tsx`):
- `ConvexAuthNextjsServerProvider`
- `ConvexClientProvider`

Dashboard layout (`app/(dashboard)/layout.tsx`):
- `AuthGuard`
- `SidebarProvider`
- `TaskModalProvider`
- `AppLayout`

## 6) Real Data vs Mock UI

Real Convex-backed sections:
- `sections/Dashboard.tsx`
- `sections/TaskBoard.tsx`
- `sections/BudgetView.tsx`
- `sections/TeamView.tsx`
- `sections/CalendarView.tsx`
- `sections/DocumentsView.tsx`
- `sections/ProfileView.tsx`
- `components/Header.tsx` menu data and counts

Partially local/mock UI state:
- `sections/SettingsView.tsx`
  - persisted: theme, language, notifications, 2FA toggle
  - still local-only: several account/security appearance controls and placeholders

## 7) Current Navigation Behavior

### Sidebar (`components/Sidebar.tsx`)

- Uses `useRouter()` push navigation, not plain links.
- Prefetches main routes in `useEffect`.
- Uses React transition state for navigation spinner/disabled buttons.
- Includes `/docs` nav entry.
- Closes task modal before route transitions.

### Header (`components/Header.tsx`)

- Search routes to `/tasks?q=...`
- Real dropdown data:
  - team activity from `api.dashboard.getActivity`
  - due alerts from `api.dashboard.getDueTasks`
- Profile menu routes to `/profile` and `/settings`
- `New Task` opens `AddTaskModal`

## 8) Access Levels and Permissions

Access levels in `teamMembers.accessLevel`:
- `admin`
- `member`
- `viewer`

Key rules:
- invite creation: admin only (`convex/invites.ts`)
- member removal: admin only (`convex/teamMembers.ts`)
- docs editing: admin/member
- docs deletion: admin or document owner

## 9) Documents Feature (Important)

Main files:
- backend: `convex/documents.ts`
- frontend: `sections/DocumentsView.tsx`
- route: `app/(dashboard)/docs/page.tsx`
- schema tables: `documents`, `documentVersions`

Capabilities:
- upload files to Convex storage (PDF/MD/JSONL/other)
- list and search docs
- create version history
- download current or historical versions
- inline text editing for markdown/jsonl by downloading content and uploading as a new version
- delete document + all versions + storage objects (permission-gated)

Design notes:
- `documents` table tracks the active/current version metadata
- `documentVersions` is immutable history
- file access is via Convex signed URLs from `getDownloadUrl`

## 10) Convex Schema Overview

Core tables:
- `teamMembers`
- `invites`
- `tasks`
- `comments`
- `documents`
- `documentVersions`
- `budgetItems`
- `expenses`
- `milestones`
- `events`
- `activityLog`
- `userProfiles`

Convex auth tables are included via `authTables`.

## 11) Known Caveats and TODOs

1. Personal task filtering now depends on `api.teamMembers.getCurrentMember`:
   - users without a team member record will not load personal tasks
   - ensure onboarding/membership creation completes for new users

2. `Dockerfile` has a temporary dependency workaround:
   - installs several packages with `npm install --no-save ...` during image build
   - this exists because those deps are imported by UI components but are not in `package.json`/`package-lock.json`
   - long-term fix: add them to package manifests and remove workaround

3. `SettingsView` is partially persisted:
   - preferences save to Convex via `api.users.getSettings` / `api.users.updateSettings`
   - several account/security controls remain UI-only placeholders

## 12) Local Development

Run both app and Convex dev:

```bash
npm run dev
npx convex dev
```

If backend types drift:
- restart `npx convex dev` to regenerate `_generated` types

## 13) Deployment Notes

Deployment is Docker/Compose based.

Public-safe deployment artifacts in repo:
- `Dockerfile`
- `docker-compose.yml`
- `.env.production.example`

Detailed operational steps are documented in local `DEPLOYMENT.md` (intentionally gitignored).

General rule:
- when touching deployment, keep `NEXT_PUBLIC_*` env handling valid at both build time and runtime.

## 14) Agent Editing Guidance for This Repo

- Do not edit `convex/_generated/*` manually.
- Prefer updating Convex functions and letting generated types follow.
- Preserve access-level checks when touching member/doc/invite logic.
- Keep dashboard/header queries fast; they are called frequently.
- Before changing deployment behavior, check local `DEPLOYMENT.md`.
- When changing public env usage in frontend, verify Docker build arg path too.
