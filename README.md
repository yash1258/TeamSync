# TeamSync

TeamSync is a collaborative product planning and execution workspace for small teams.
It connects `projects -> issues -> tasks` in a single flow, with roadmap, decisions, docs, budget, and team activity in one app.

## Keywords

`project management`, `team collaboration`, `issue tracking`, `task board`, `roadmap planning`, `linear alternative`, `next.js`, `convex`

## Features

- Planning Hub for native projects, issues, and status tracking.
- Connected workflow model: `Project -> Issue -> Task`.
- Roadmap view with quarter filters, project windows, and Now/Next buckets.
- Decisions view for ADR-style records tied to projects/issues/tasks.
- Task Board with team and personal work management.
- Team activity timeline and member workspace.
- Document workspace and collaboration notes.
- Budget module for categories, expenses, and basic stats.
- Role-aware team permissions (admin/member).

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Convex (database, auth integration, realtime backend)
- Tailwind CSS 4 + Radix UI + Lucide
- Docker + Docker Compose deployment model

## Architecture (High Level)

- Frontend routes and views live in `app/`, `components/`, and `sections/`.
- Backend schema and functions live in `convex/`.
- Core planning entities:
  - `projects`
  - `issues`
  - `tasks`
  - `decisions`
- Issue-task linking is represented through tags and relation helpers.

## Quick Start (Local)

### 1. Prerequisites

- Node.js 20.10+ (Node 22 recommended)
- npm 10+
- A Convex account/project

### 2. Install

```bash
git clone https://github.com/yash1258/TeamSync.git
cd TeamSync
npm ci
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Then set values in `.env.local`:

- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `CONVEX_SITE_URL` (for auth provider domain)

You can keep `NEXT_PUBLIC_FEATURE_PLANNING_HUB=true` and `FEATURE_PLANNING_HUB=true` for full planning routes.

### 4. Run Convex + App

Terminal 1:

```bash
npx convex dev
```

Terminal 2:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Authentication Notes

- Convex auth is configured in `convex/auth.ts` and `convex/auth.config.ts`.
- This repo uses GitHub provider through Convex auth.
- Configure provider secrets/domains in your Convex project dashboard for local and production environments.

## Quality Checks

```bash
npm run lint
npm run build
```

## Deployment

Production deployment uses Docker + Nginx Proxy Manager.

See:

- `DEPLOYMENT.md` for VPS deployment/redeploy runbook
- `Dockerfile`
- `docker-compose.yml`
- `.env.production.example`

## Repository Structure

```text
app/                Next.js routes/layout/providers
components/         Shared UI components and layout shell
sections/           Feature-level page views
convex/             Convex schema, queries, mutations, auth
hooks/              Reusable React hooks
lib/                Utilities and feature flags
```

## Open Source Docs

- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)
- [License](./LICENSE)

## Roadmap

Planned and in-progress work is tracked in `IMPLEMENTATION_PLAN.md`.

## License

MIT, see [LICENSE](./LICENSE).
