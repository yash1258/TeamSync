# Contributing to TeamSync

Thanks for contributing.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
npm ci
```

3. Configure environment:

```bash
cp .env.example .env.local
```

4. Run Convex and Next.js:

```bash
npx convex dev
npm run dev
```

## Branching and Commits

- Use focused branches per change.
- Keep commits small and scoped.
- Write clear commit messages in imperative mood.

Examples:

- `Fix mobile sidebar overlay close behavior`
- `Add project issue filters in planning view`

## Pull Request Checklist

- Code is scoped to one concern.
- Local checks pass:

```bash
npm run lint
npm run build
```

- If Convex schema/functions changed, deploy Convex before app deploy:

```bash
npx convex deploy --yes
```

- Update docs for behavior changes.
- Include screenshots for visual changes.

## Coding Expectations

- Prefer TypeScript strictness over `any`.
- Reuse existing patterns in `sections/` and `components/`.
- Keep UI state predictable and avoid hidden side effects.
- Validate authorization assumptions in Convex mutations.

## Reporting Bugs

Open a GitHub issue with:

- expected behavior
- actual behavior
- reproduction steps
- logs/screenshots
- environment (browser, OS, Node version)
