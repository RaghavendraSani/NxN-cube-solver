# CubeSolver

CubeSolver is an offline browser application for manually recreating and solving physical Rubik's Cubes. The user selects a cube size, paints individual facelets using six fixed colors, validates the state, and follows a verified solution through interactive one-move-at-a-time 3D playback.

## Project status

The 3×3 through 20×20 editors, locally calculated replay-verified solutions, and interactive move playback are implemented. The owner has approved milestones 9 and 10; milestones 11 and 12 are implemented and awaiting the owner's browser verification (see the roadmap for what has and has not been run).

Sizes 3×3×3 and 4×4×4 use their original solvers. Sizes 5×5×5 through 20×20×20 use a project-owned reduction solver: it repairs every center and wing group with exact 3-cycles, solves the reduced 3×3×3 with the existing solver, and replays the whole solution on the full cube before showing it. Solutions are correct, not short: about 360 moves on a 5×5 and about 9,700 on a 20×20. Playback offers auto-play, skip, and jump controls for long solutions.

The 4×4 validator checks color counts, corner identity and twist, and wing identities. Its implementation has not been formally verified, and the solver may time out or fail on a valid state. Every solution is independently replayed before display. Switching cube size clears the current entry.

## Core behavior

- Browser-based and offline at runtime.
- No camera, backend, account, or database.
- Six fixed palette colors.
- All-white initial cube with an internal distinction between unassigned and intentionally white facelets.
- Single-square color painting and recoloring.
- Fixed camera with animated cube-model rotations.
- Exactly three visible faces at a time.
- State checks before solving, followed by independent solution verification.
- Guaranteed-correct solution prioritized over solution length.
- Web Worker-based solving so the interface remains responsive.
- Interactive playback advances one move at a time with adjustable animation speed.
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
- Node.js 22.12–22.x, 24.x, or 26 and later, plus npm. Node.js 23 and 25 are not supported by the current Vitest version.
- A modern browser with WebGL 2 support.
- An editor with TypeScript support.

### Local commands

Install dependencies and start the development server:

```powershell
npm install
npm run dev
```

Every size can be tried without a physical cube: choose a size and press **Load example** to fill in a legal scrambled cube. Entering a 20×20 by hand means painting 2,400 squares, so the example loader is the practical way to inspect large sizes; **Zoom in** and **Zoom out** help when painting them.

Quality checks will be exposed through scripts similar to:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

To run the browser tests, install the Playwright browsers once and run:

```powershell
npx playwright install chromium firefox webkit
npm run test:e2e
```

To test the built application through a local static server in PowerShell:

```powershell
npm run build
$env:PLAYWRIGHT_PREVIEW = '1'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_PREVIEW
```

The application uses local files and makes no external runtime requests. A local static server must remain available for loading the application and its worker; this does not install an offline cache for use after disconnecting from that server.

The workflow in `.github/workflows/ci.yml` runs on pushes, pull requests, or manual invocation in GitHub Actions. It installs the locked dependencies and Playwright browsers, then runs the checks against the production build.

## Contribution workflow

`main` should remain stable. Work should be performed on a feature branch, tested, committed as a focused milestone, pushed, and merged through a pull request. See [AGENTS.md](AGENTS.md) for the repository workflow and [ROADMAP.md](ROADMAP.md) for milestone boundaries.

## Current limitations

- Playback has not yet been verified against a physical cube.
- 4×4 playback has not yet been verified against a physical cube; solver success on every legal state is not established.
- Cube sizes above 4×4 are not yet supported.
- Camera scanning, persistence, accounts, cloud synchronization, and accessibility enhancements are deferred.

