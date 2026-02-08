# TeamSync Implementation Plan

This plan is intentionally execution-focused: each phase has concrete tasks, file targets, acceptance criteria, and rollout notes.

## Scope

Primary goals:
- stabilize task ownership and personal-task identity
- reduce auth/identity edge-case failures
- persist currently local settings to backend
- harden deployment/build reliability
- improve document workflow depth for internal teams

Out of scope for this cycle:
- major visual redesign
- multi-tenant/org separation
- external billing/subscription logic

## Phase 1: Core Stability (In Progress)

### 1.1 Remove hardcoded identity in Task Board

Status: `COMPLETED`

Files:
- `sections/TaskBoard.tsx`

Tasks:
- replace hardcoded email lookup (`getByEmail`) with authenticated member lookup (`getCurrentMember`)
- ensure personal-task query only runs with a valid current member id
- handle no-member and loading states explicitly (no permanent loading)
- remove dead/unused conversion helpers and stale logic

Acceptance criteria:
- no hardcoded user identity in task view code
- team view still loads for authenticated users
- personal view only queries when current member exists
- no infinite spinner when member record is absent

### 1.2 Correct task ownership on creation

Status: `COMPLETED`

Files:
- `components/AddTaskModal.tsx`

Tasks:
- set `ownerId` to current authenticated member id
- keep `assigneeId` as selected assignee id
- block task creation when current user is not a team member
- present actionable UX for membership-required state

Acceptance criteria:
- created tasks have correct owner relationship
- task creation cannot submit invalid ownership payloads
- users without team membership get a clear prompt and recovery action

### 1.3 Harden current-member backend resolution

Status: `COMPLETED`

Files:
- `convex/teamMembers.ts`

Tasks:
- update `getCurrentMember` to resolve by `by_user` index first
- fallback to `by_email` only when needed

Acceptance criteria:
- users linked by `userId` resolve without depending on email match
- existing members matched by email still resolve

### 1.4 Validation for Phase 1

Status: `IN PROGRESS`

Tasks:
- run targeted lint on touched files ✅
- manually verify:
  - create task -> click task -> modal opens
  - personal/team toggle behaves correctly
  - new task owner is current member

## Phase 2: Settings Persistence (Planned)

### 2.1 Persist settings data

Status: `IN PROGRESS`

Files:
- `convex/schema.ts`
- `convex/*.ts` (new settings functions)
- `sections/SettingsView.tsx`
- `convex/_generated/*` (via regenerate, not manual edit)

Tasks:
- add backend settings shape for user preferences ✅
- wire settings query/mutation in UI ✅
- replace fake save toast behavior with real persistence ✅
- preserve optimistic UX and show save errors ✅
- remaining: wire account/security form fields that are still static mock inputs

Acceptance criteria:
- refresh page and settings values remain
- save action writes to Convex successfully
- missing settings bootstrap with defaults safely

## Phase 3: Docs Workflow Expansion (Planned)

### 3.1 Improve document discoverability and governance

Status: `PLANNED`

Files:
- `sections/DocumentsView.tsx`
- `convex/documents.ts`
- optional new shared components under `components/`

Tasks:
- stronger filtering and metadata editing UX (tags/description)
- better version audit context (uploader + change notes prominence)
- add richer preview behavior for text docs where feasible

Acceptance criteria:
- users can quickly find docs by search + metadata
- version timeline is clear and actionable
- edit/version actions remain permission-safe

## Phase 4: Deployment/Build Reliability (Planned)

### 4.1 Remove temporary dependency workaround in Docker build

Status: `PLANNED`

Files:
- `package.json`
- `package-lock.json`
- `Dockerfile`

Tasks:
- add missing runtime deps to package manifest properly
- regenerate lockfile
- remove `npm install --no-save ...` workaround from Dockerfile

Acceptance criteria:
- `npm ci` + `npm run build` succeed without extra install step
- Docker build succeeds with clean deterministic dependency graph

## Phase 5: Post-Stability UX Enhancements (Planned)

### 5.1 Priority improvements after stable baseline

Status: `PLANNED`

Targets:
- task filters/saved views
- richer activity logging
- admin access-level management UI polish

## Rollout Order

1. Complete Phase 1 and validate.
2. Start Phase 2 with backend schema + query/mutation first.
3. Expand docs UX (Phase 3).
4. Finalize deployment dependency cleanup (Phase 4).

## Risks and Mitigations

- Risk: schema additions require generated API refresh.
  - Mitigation: run Convex dev/generate immediately after schema/function changes.

- Risk: ownership logic changes can break personal task assumptions.
  - Mitigation: verify owner/assignee mapping with manual checks on fresh tasks.

- Risk: deployment cleanup may expose hidden dependency issues.
  - Mitigation: run local build + Docker build before merging.
