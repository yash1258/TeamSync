# TeamSync Collaboration Platform Implementation Plan

This is the master plan for building the collaboration system your team described: planning workflow, schema evolution, landing planning, data scraping, and context graph architecture.

## 1) Objective

Build a Linear-style collaboration layer on top of TeamSync so the team can:
- plan work from idea -> execution -> launch,
- connect decisions to evidence,
- track projects/cycles/issues with high signal,
- ingest external data (scraping) into product planning,
- navigate everything through a context graph.

## 2) Current Baseline (Already Shipped)

These are done and should be treated as starting constraints:
- team access-control hardening (`convex/teamMembers.ts`, `sections/TeamView.tsx`, `sections/SettingsView.tsx`)
- invite lifecycle management + audit feed (`convex/invites.ts`, `components/InviteMemberModal.tsx`)
- secure task mutations + task comments + activity logging (`convex/tasks.ts`, `components/TaskModal.tsx`)
- saved task views (`convex/schema.ts`, `convex/users.ts`, `sections/TaskBoard.tsx`)
- initial Planning Hub route and UI (`app/(dashboard)/planning/page.tsx`, `sections/PlanningView.tsx`)

## 3) Scope for This Program

In scope:
- collaboration domain model (initiatives, projects, cycles, issues, decisions)
- planning-first UX and keyboard operations
- context graph foundation and explorer
- scraping source management and ingestion tracking
- landing/launch planning workflow

Out of scope for now:
- multi-tenant org model
- billing/subscription
- public API/SDK for third parties

## 4) Delivery Strategy

- Ship in controlled phases with explicit gates.
- Keep existing `tasks` stable while introducing `issues` domain.
- Use additive schema migrations first, then deprecate old paths.
- Do not block feature rollout on full AI/graph sophistication; ship usable slices.

## 5) Phase Plan

### Phase 0: Foundation and Guardrails

Status: `COMPLETED`

Goal:
- establish safe migration and rollout controls before adding core entities.

Files:
- `convex/schema.ts`
- `convex/seed.ts`
- `IMPLEMENTATION_PLAN.md`
- `agent.md`

Tasks:
- add feature flags for planning modules (server-side + UI guard) ✅
- define migration policy (`tasks` coexists with new `issues`) ✅
- define naming conventions and ID/reference patterns ✅
- update docs for migration/runbook expectations ✅

Acceptance criteria:
- plan rollout can be toggled per route/section
- no breaking schema changes to current production flows
- migration approach is documented for the team

Gate to proceed:
- sign-off on migration strategy and naming conventions

### Phase 1: Collaboration Domain Schema

Status: `IN PROGRESS` (schema/modules added; Convex codegen/deploy deferred)

Goal:
- introduce the core data model needed for Linear-like workflows.

Files:
- `convex/schema.ts`
- new modules under `convex/`: `initiatives.ts`, `projects.ts`, `cycles.ts`, `issues.ts`, `issueRelations.ts`, `decisions.ts`

Tasks:
- add tables:
  - `initiatives`
  - `projects`
  - `cycles`
  - `issues`
  - `issueRelations`
  - `decisions`
- add table definitions to schema and module scaffolding ✅
- add indexes for common queries (status, owner, cycle, project, due date) ✅
- wire baseline CRUD queries/mutations with permission checks ✅
- ensure activity logging hooks for key mutations ✅

Acceptance criteria:
- all new entities can be created/read/updated/deleted via Convex
- permission behavior matches current team policy
- `_generated` types compile with no manual edits

Gate to proceed:
- schema review complete and sample seed data loads cleanly

### Phase 2: Planning UI Core (Linear-style)

Status: `IN PROGRESS`

Goal:
- build first-class planning UX around new schema.

Files:
- `app/(dashboard)/planning/page.tsx`
- new routes:
  - `app/(dashboard)/projects/page.tsx`
  - `app/(dashboard)/roadmap/page.tsx`
  - `app/(dashboard)/decisions/page.tsx`
- sections/components:
  - `sections/PlanningView.tsx`
  - `sections/ProjectsView.tsx`
  - `sections/RoadmapView.tsx`
  - `sections/DecisionsView.tsx`
  - `components/planning/*`

Tasks:
- triage inbox for unplanned/unassigned issues ✅
- project board/list/timeline views ✅
- project creation flow in `ProjectsView` with modal CTA + optional kickoff issue creation ✅
- project creation entrypoints from Planning Hub and command palette (`/projects?create=1`) ✅
- cycle planner (current/upcoming/closed) ✅
- issue detail drawer/modal with relations and activity (activity wired, issue-relations UI pending)
- decision log list + detail + link-to-issue/project ✅
- dedicated routes and sidebar entries for Projects/Roadmap/Decisions ✅
- route + middleware rollout gating for planning modules ✅

Acceptance criteria:
- product team can run weekly planning entirely inside app
- issue lifecycle from triage to done is complete
- decisions can be linked and discovered from related work

Gate to proceed:
- internal dogfood for one full planning cycle
- complete issue-relations UI in detail drawer

### Phase 3: Command Palette and Keyboard-First Flow

Status: `IN PROGRESS`

Goal:
- improve speed and reduce UI friction for day-to-day collaboration.

Files:
- `components/Header.tsx`
- `components/planning/CommandPalette.tsx`
- `hooks/useCommandPalette.ts`

Tasks:
- global command palette (`Cmd/Ctrl+K`) ✅
- quick actions: create issue/project/decision, move cycle, assign, change status/priority (create issue + create project route entry + decision + fast status/priority + assignment + cycle move commands for surfaced issues done; project/cycle entity-native commands pending)
- fuzzy search over issues/projects/decisions/docs (issues + decisions + route/search navigation done; richer project/doc entity search pending)
- keyboard shortcuts for common issue actions ✅
  - direct global shortcuts for the currently opened task are active:
    - `Alt+Shift+S`: start (`in-progress`)
    - `Alt+Shift+D`: mark done
    - `Alt+Shift+H`: set high priority
    - `Alt+Shift+A`: assign to me
    - `Alt+Shift+C`: move to current cycle tag
    - `Alt+Shift+N`: move to next cycle tag
- shortcut discoverability UX ✅
  - command palette footer now includes a visible keyboard cheat sheet
  - task modal sidebar now includes a `Quick Keys` panel for active issue shortcuts

Acceptance criteria:
- key workflows can be completed without mouse-heavy navigation
- command actions are auditable in activity log

Gate to proceed:
- team confirms command palette replaces common multi-click flows

### Phase 4: Context Graph Foundation

Status: `PLANNED`

Goal:
- connect planning artifacts into a traversable graph.

Files:
- `convex/schema.ts`
- new modules: `convex/contextGraph.ts`
- new route: `app/(dashboard)/graph/page.tsx`
- `sections/GraphView.tsx`

Tasks:
- add tables:
  - `contextNodes`
  - `contextEdges`
- create sync functions to upsert nodes/edges from:
  - issues
  - projects
  - decisions
  - documents
- implement graph queries (neighbors, path hints, typed filters)
- build graph explorer UI (list + relation panel first, visual canvas optional second)

Acceptance criteria:
- from any issue, users can see connected decisions/docs/projects
- graph queries are fast enough for interactive use

Gate to proceed:
- graph links validated on real planning data

### Phase 5: Sources and Scraping Pipeline

Status: `PLANNED`

Goal:
- ingest external signals and tie them to product planning.

Files:
- `convex/schema.ts`
- new modules: `convex/sources.ts`, `convex/ingestion.ts`
- new route: `app/(dashboard)/sources/page.tsx`
- `sections/SourcesView.tsx`

Tasks:
- add tables:
  - `sources`
  - `ingestionRuns`
  - optional parsed artifact table (if needed)
- source CRUD (URL/provider/config/status)
- ingestion run creation, state tracking, and run logs
- parsed entities mapped into context nodes/edges
- surface ingestion health and last-run outcome in UI

Acceptance criteria:
- team can register sources and run ingestion jobs
- ingestion output appears in context graph and planning context panels
- failed runs are observable and debuggable

Gate to proceed:
- at least 2 real sources producing useful planning context

### Phase 6: Landing and Launch Collaboration Workflow

Status: `PLANNED`

Goal:
- make landing-page and launch planning a first-class workflow.

Files:
- `sections/PlanningView.tsx`
- new templates/components under `components/planning/templates/*`
- optional module: `convex/launchPlans.ts`

Tasks:
- launch plan template (goals, audience, messaging, KPI, owner, deadline)
- auto-create issue bundles for launch workstreams
- link decisions/docs/sources to launch plan
- launch readiness checklist and status gates

Acceptance criteria:
- a launch plan can be created and executed end-to-end in app
- stakeholders can inspect evidence chain from source -> decision -> issue -> launch step

Gate to proceed:
- one complete internal launch plan run through system

### Phase 7: Hardening and Production Readiness

Status: `PLANNED`

Goal:
- stabilize before broad team adoption.

Files:
- touched modules across `convex/*`, `sections/*`, `components/*`
- deployment files where needed

Tasks:
- query performance tuning and index review
- validation and authorization test pass
- UX cleanup for edge states and empty states
- error telemetry and activity consistency checks
- docs/runbook refresh

Acceptance criteria:
- no critical permission or data integrity bugs
- planning workflows remain responsive under realistic team load
- deployment and rollback steps are documented

Gate to close program:
- release candidate approved and deployed

## 6) End-State Checklist (Definition of Done)

At the end of this program, all items below must be true:
- team can manage initiatives, projects, cycles, and issues in-app
- decisions are first-class and linked to execution artifacts
- command palette covers common planning actions
- context graph shows meaningful connections between work and evidence
- scraping sources are managed in-app and ingestion runs are observable
- launch/landing planning template exists and is used
- activity feed provides reliable collaboration audit trail
- performance and permission checks pass for all new modules

## 7) Execution Order (One by One)

Follow this exact order:
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7

Rule:
- do not begin next phase until current phase acceptance criteria are met and explicitly signed off.

## 8) Validation Commands Per Iteration

Run on every phase completion:

```bash
git status -sb
npx eslint sections components convex
npm run build
```

If schema/functions changed:

```bash
npx convex dev
# verify generated types compile
npx convex deploy --yes
```

## 9) Progress Log

- 2026-02-22: `44db801` shipped Planning Hub route and collaboration master roadmap.
- 2026-02-22: `b399ccc` added planning rollout flags and Phase 0 migration conventions.
- 2026-02-22: `9783c61` added Phase 1 collaboration schema modules (`initiatives/projects/cycles/issues/decisions`).
- 2026-02-22: `ab0864d` added Phase 2 planning routes and views (`projects`, `roadmap`, `decisions`) with route gating.
- 2026-02-22: `940f557` added Phase 3 command palette foundation (`Cmd/Ctrl+K`, navigation, issue/decision search).
- 2026-02-22: `b980c83` added issue status/priority action commands in the palette.
- 2026-02-22: added assignment and cycle-move commands in the command palette (cycle tags: `cycle:current`/`cycle:next`).
- 2026-02-22: added direct global issue shortcuts (`Alt+Shift+S/D/H/A/C/N`) for the currently opened task.
- 2026-02-22: added shortcut cheat sheet UI in command palette and task modal.
- 2026-02-22: added project creation UX polish (new `ProjectsView` CTA/modal, optional kickoff issue, improved filter/toggle spacing).
- 2026-02-22: added project creation entrypoints from Planning Hub and command palette (`Create Project` -> `/projects?create=1`).

## 10) Risks and Mitigations

- Risk: schema sprawl and query slowdowns.
  - Mitigation: strict index reviews at each phase gate.

- Risk: dual model confusion (`tasks` vs `issues`).
  - Mitigation: migration boundaries documented, phased UI cutover.

- Risk: scraping introduces noisy/low-quality signals.
  - Mitigation: source quality scoring + run-level diagnostics.

- Risk: graph complexity hurts usability.
  - Mitigation: ship relation panels first, visual graph second.

- Risk: hidden permission regressions.
  - Mitigation: preserve server-side checks as source of truth and test mutations directly.

## 11) Migration and Naming Conventions

These conventions are the Phase 0 source of truth.

Migration policy:
- keep existing `tasks` as the execution backbone while introducing `issues`
- do not hard-delete or repurpose `tasks` fields during early phases
- prefer additive schema changes and dual-read adapters during cutover periods
- only deprecate old paths after parity validation and one full dogfood cycle

Naming policy:
- Convex modules: singular domain files (`issues.ts`, `projects.ts`, `cycles.ts`)
- table names: plural nouns (`issues`, `projects`, `cycles`, `decisions`)
- reference fields: `<entity>Id` and always typed to table ids
- relation tables: explicit directional fields (`fromIssueId`, `toIssueId`)
- context graph edge types: lower_snake_case verbs/nouns (`depends_on`, `informed_by`, `related_to`)

ID/reference patterns:
- never pass client-trusted identity for ownership/audit; resolve from auth on server
- log activity for key state transitions in planning modules
- indexes are required for list queries that power dashboard/planning landing views
