# TeamSync Convex Backend

This folder contains TeamSync backend logic running on Convex.

## What Lives Here

- `schema.ts`: table definitions and indexes
- `tasks.ts`: task queries/mutations and permissions
- `projects.ts`: native planning projects
- `issues.ts`: native planning issues
- `decisions.ts`: decision records
- `documents.ts`: docs/knowledge functions
- `dashboard.ts`: dashboard stats/activity aggregations
- `auth.ts` and `auth.config.ts`: auth integration

## Local Development

From repo root:

```bash
npx convex dev
```

This runs local development sync for functions and schema.

## Deploy Convex Backend

```bash
npx convex deploy --yes
```

Run this before app deploy when schema/functions changed.

## Notes

- Keep mutation authorization checks explicit.
- Preserve index usage when adding query filters.
- Update frontend types/usages after schema changes.
