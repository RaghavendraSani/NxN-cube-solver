# CubeSolver

CubeSolver is an offline browser application for manually recreating and solving physical Rubik's Cubes. The user selects a cube size, paints individual facelets using six fixed colors, validates the state, and follows a verified solution through interactive one-move-at-a-time 3D playback.

## Project status

The 3×3 and 4×4 editors, locally calculated replay-verified solutions, and interactive move playback are implemented. The owner has approved milestones 9 and 10; known limitations are recorded below and in the roadmap.

The current implementation supports 3×3×3 and 4×4×4. Support for 5×5×5 through 20×20×20 is planned incrementally.

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

