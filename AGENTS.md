# Project Instructions for Contributors and Coding Agents

This file contains persistent working rules. It intentionally does not duplicate the full requirements, architecture, or roadmap. Read the linked documents before making project changes.

## Required reading

1. [REQUIREMENTS.md](REQUIREMENTS.md) — product scope and acceptance requirements.
2. [ARCHITECTURE.md](ARCHITECTURE.md) — approved boundaries and technical decisions.
3. [ROADMAP.md](ROADMAP.md) — current milestone, dependencies, and completion criteria.

## Current project state

Milestone 6 is complete and approved. Milestone 7 is implemented and awaits owner manual verification and approval; do not begin Milestone 8 until requested by the project owner. Ask for the owner's approval before writing or changing code, and explain the purpose of proposed changes.

## Scope rules

- Preserve the offline, client-only architecture unless a new decision is explicitly approved.
- Do not add a backend, database, authentication, analytics, camera scanning, or persistence implicitly.
- Treat 3×3 as the first complete product slice.
- Do not enable a larger cube size until its validation, solver, renderer, playback, and tests meet the roadmap criteria.
- Do not claim a solution is correct until it has been replay-verified against the domain state.

## Architecture boundaries

- Keep cube logic independent of React and Three.js.
- Keep the canonical puzzle state separate from display orientation.
- Keep rendering code responsible for visualization and animation, not business rules.
- Keep solver dependencies behind size-specific adapters.
- Run solving in a Web Worker once solver execution is implemented.
- Commit logical moves only after their visual animations finish.

## State and interaction conventions

- Use logical color identifiers, including a distinct `Unassigned` value.
- A palette selection followed by a click changes exactly one facelet.
- Recoloring is supported by painting an already assigned facelet again.
- Editing view rotations must never alter the logical puzzle state.
- Playback advances one move at a time.
- Do not introduce drag painting unless the requirements are explicitly changed.
- Do not add user cancellation to the solve workflow without an approved requirements change.
- Do not persist incomplete entries or playback progress.

## TypeScript and code conventions

- Use strict TypeScript settings.
- Prefer small modules with explicit interfaces and named domain types.
- Avoid `any`; use a typed result or error model instead.
- Keep coordinate and face-orientation mappings centralized.
- Prefer pure functions for move application, validation, conversion, and notation.
- Use immutable inputs or defensive copies at domain boundaries.
- Keep React components focused on presentation and interaction wiring.
- Dispose Three.js resources and event listeners when components unmount.
- Add comments for coordinate conventions and non-obvious cube mathematics.

## Testing requirements

- Every domain change requires unit tests.
- Every move or coordinate change requires inverse and round-trip tests where applicable.
- Every solver integration change requires replay-verification tests.
- Renderer changes require browser tests or a documented reason why a unit test is sufficient.
- Run type-checking, linting, unit tests, and production build before marking a milestone complete.
- Use browser-level tests for the complete edit → validate → solve → playback flow.
- Maintain legal and intentionally invalid cube fixtures.

The canonical milestone-specific test requirements are in [ROADMAP.md](ROADMAP.md).

## Dependency and security rules

- Prefer the smallest dependency set that satisfies the approved architecture.
- Pin dependency versions in the lockfile.
- Review licenses and maintenance status before adopting solver or rendering dependencies.
- Do not load runtime code from a CDN.
- Never commit credentials, API keys, `.env` files, virtual environments, `node_modules`, or build output.
- Do not use `eval` or unsafe HTML injection.

## Documentation rules

- Update [REQUIREMENTS.md](REQUIREMENTS.md) only when a requirement is deliberately changed.
- Update [ARCHITECTURE.md](ARCHITECTURE.md) and record an ADR when an architectural decision changes.
- Update [ROADMAP.md](ROADMAP.md) when milestone status or acceptance criteria change.
- Keep [README.md](README.md) focused on project overview, setup, and user-facing development information.
- Do not copy entire documents into this file; link to them instead.

## Git and milestone workflow

- Work on a feature branch when collaborating.
- Keep `main` stable.
- Make focused commits at completed milestones rather than mixing unrelated work.
- Run the required checks before asking for a commit.
- Review `git diff` and `git status` before committing.
- Do not commit generated files or secrets.
- The project owner performs manual commit and push operations.
- At milestone completion, provide the owner with the exact files to stage, recommended commit message, and push commands.

## Definition of done

A change is complete only when:

1. It satisfies the relevant requirement.
2. It respects the approved architecture.
3. Its tests pass, including regression tests.
4. It has no accidental generated or sensitive files.
5. Documentation and roadmap status are updated when applicable.
6. The milestone acceptance criteria are demonstrably met.




Master Rules:
1. Think Before Coding: Avoid assumptions, surface trade-offs, state assumptions explicitly, and ask for clarification.
2. Simplicity First: Write minimal code; skip speculative features, over-engineering, or unrequested flexibility.
3. Surgical Changes: Touch only necessary code, avoid refactoring unbroken adjacent files, and match existing styles.
4. Goal-Driven Execution: Establish clear success criteria, write tests first, and verify through test loops.
