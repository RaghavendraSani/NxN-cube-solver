# CubeSolver

CubeSolver is an offline browser application for manually recreating and solving physical Rubik's Cubes. The user selects a cube size, paints individual facelets using six fixed colors, validates the state, and follows a verified solution through interactive one-move-at-a-time 3D playback.

## Project status

The architecture and implementation roadmap are approved. The 3×3 editor and state validation are complete. Solving is not implemented yet.

The initial implementation target is a complete 3×3×3 experience. Support for 4×4×4 through 20×20×20 will be added incrementally.

## Core behavior

- Browser-based and offline at runtime.
- No camera, backend, account, or database.
- Six fixed palette colors.
- All-white initial cube with an internal distinction between unassigned and intentionally white facelets.
- Single-square color painting and recoloring.
- Fixed camera with animated cube-model rotations.
- Exactly three visible faces at a time.
- Complete validation before solving.
- Guaranteed-correct solution prioritized over solution length.
- Web Worker-based solving so the interface remains responsive.
- Interactive playback one move at a time with adjustable animation speed.
- No persistence of incomplete entries.

## Documentation

- [REQUIREMENTS.md](REQUIREMENTS.md) — approved functional and nonfunctional requirements.
- [ARCHITECTURE.md](ARCHITECTURE.md) — approved system architecture and technical decisions.
- [ROADMAP.md](ROADMAP.md) — milestone plan, dependencies, tests, and acceptance criteria.
- [AGENTS.md](AGENTS.md) — persistent development conventions and operating instructions.

## Planned technology stack

- TypeScript.
- React.
- Vite.
- Three.js.
- Web Workers.
- Vitest.
- Playwright.
- ESLint and Prettier.

The exact dependency versions will be pinned when the implementation bootstrap milestone begins.

## Development setup

### Prerequisites

- Git.
- Node.js current supported LTS release and npm.
- A modern browser with WebGL 2 support.
- An editor with TypeScript support.

### Planned local commands

Once the implementation bootstrap milestone creates `package.json`, the expected workflow will be:

```powershell
npm install
npm run dev
```

Quality checks will be exposed through scripts similar to:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

The exact script names will be finalized during the tooling milestone.

The current documentation-only repository has no runnable application yet.

## Contribution workflow

`main` should remain stable. Work should be performed on a feature branch, tested, committed as a focused milestone, pushed, and merged through a pull request. See [AGENTS.md](AGENTS.md) for the repository workflow and [ROADMAP.md](ROADMAP.md) for milestone boundaries.

## Current limitations

- No application code is currently implemented.
- Only the 3×3 solver is planned for the first complete release.
- Camera scanning, persistence, accounts, cloud synchronization, and accessibility enhancements are deferred.

