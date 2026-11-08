# CubeSolver Development Roadmap

**Status:** M6 complete and approved

**Current phase:** Awaiting Milestone 7

**Release strategy:** 3×3 vertical slice first, then incremental larger cubes

## How to use this roadmap

Each milestone must produce a testable result. A milestone is complete only when its implementation steps, tests, acceptance criteria, and documentation updates are complete.

Recommended status values:

- `Not started`
- `In progress`
- `Blocked`
- `Complete`

## Progress tracker

| Milestone | Description | Status | Depends on |
|---|---|---|---|
| M0 | Requirements, architecture, and project documentation | Complete | None |
| M1 | Frontend/tooling bootstrap and empty application | Complete | M0 |
| M2 | Framework-independent cube domain core | Complete | M1 |
| M3 | Three.js 3×3 model and facelet hit mapping | Complete | M2 |
| M4 | Palette painting and animated view navigation | Complete | M3 |
| M5 | 3×3 validation | Complete | M4 |
| M6 | Solver worker and verified solution generation | Complete | M5 |
| M7 | Interactive move playback | Not started | M6 |
| M8 | End-to-end hardening and MVP release | Not started | M7 |
| M9 | NxN domain and notation extension for 4×4 | Not started | M8 |
| M10 | 4×4 solving, parity, and playback | Not started | M9 |
| M11 | 5×5 and generalized reduction foundations | Not started | M10 |
| M12 | Larger-cube performance and 6×6–20×20 expansion | Not started | M11 |

---

## M0 — Documentation and architecture baseline

**Status:** Complete

### Objective and outcome

Record the approved requirements, architecture, development conventions, and roadmap before implementation begins.

### Features and deliverables

- `README.md`.
- `REQUIREMENTS.md`.
- `ARCHITECTURE.md`.
- `ROADMAP.md`.
- `AGENTS.md`.
- Existing `.gitignore` reviewed.

### Dependencies

None.

### Validation

- All documents agree on the offline browser scope.
- All documents identify 3×3 as the first implementation.
- No implementation code is introduced.

### Acceptance criteria

- A new contributor can understand the goal, constraints, architecture, and next milestone from the documentation.

---

## M1 — Tooling bootstrap and empty application

### Objective and expected outcome

Create a reproducible TypeScript/React/Vite application that builds, runs locally, and has automated quality checks, but does not yet implement cube logic.

### Planned files and modules

- `package.json` and lockfile.
- `index.html`.
- `src/main.tsx`.
- `src/app/App.tsx`.
- `src/app/app.css`.
- `tsconfig*.json`.
- `vite.config.ts`.
- `eslint.config.*`.
- Prettier configuration.
- `vitest.config.ts`.
- `tests/smoke/`.
- Optional initial CI workflow under `.github/workflows/`.

### Dependencies

M0.

### Implementation order

1. Initialize the package manifest and lockfile.
2. Add React, TypeScript, Vite, test, lint, and formatting tooling.
3. Configure strict TypeScript and consistent module boundaries.
4. Create the application entry point and minimal layout.
5. Add scripts for development, build, type-checking, linting, and tests.
6. Add the first CI check if repository hosting is ready.

### Testing and validation

- Start the development server.
- Run the production build.
- Run type-checking and linting.
- Run one smoke test that mounts the application.

### Acceptance criteria

- A clean checkout can install dependencies and start the app.
- The browser shows a documented placeholder screen.
- Build, type-check, lint, and test commands pass.
- No cube behavior is claimed yet.

### Actual progress

- Added the TypeScript/React/Vite package and lockfile.
- Added strict application and tooling TypeScript configurations.
- Added the React application shell and responsive placeholder styling.
- Added ESLint and Prettier configuration.
- Added a Vitest/jsdom smoke test for the application shell.
- Added Milestone 1 scripts for development, build, type-checking, linting, formatting, and tests.
- Confirmed the Vite development server responds with HTTP 200 and serves the CubeSolver root page.

### Verification completed

```text
npm.cmd run typecheck       PASS
npm.cmd run lint            PASS
npm.cmd run format:check    PASS
npm.cmd test                PASS (1 test)
npm.cmd run build           PASS
npm.cmd run dev             PASS (HTTP 200 at http://127.0.0.1:5173/)
```

The development server was stopped after verification. Cube domain, rendering, editing, validation, solver, and playback work remain for later milestones.

---

## M2 — Framework-independent cube domain core

**Status:** Complete and approved.

### Objective and expected outcome

Implement the canonical 3×3 cube state and move mechanics without depending on React or Three.js.

### Planned files and modules

- `src/domain/cube/types.ts`.
- `src/domain/cube/colors.ts`.
- `src/domain/cube/faces.ts`.
- `src/domain/cube/state.ts`.
- `src/domain/cube/moves.ts`.
- `src/domain/cube/applyMove.ts`.
- `src/domain/cube/isSolved.ts`.
- `src/domain/cube/coordinates.ts`.
- `tests/unit/domain/cube/`.

### Dependencies

M1.

### Implementation order

1. Define logical colors, including `Unassigned`.
2. Define the fixed face order and row/column conventions.
3. Define immutable or safely cloned cube-state operations.
4. Define normalized move objects for quarter turns and half turns.
5. Implement face-turn permutations.
6. Implement solved-state detection.
7. Add inverse-move support for tests.

### Testing and validation

- A solved cube is recognized as solved.
- Applying a move four times restores the original state.
- Applying a move followed by its inverse restores the original state.
- Known move sequences produce expected facelet states.
- All face orientations and row/column mappings have direct tests.

### Acceptance criteria

- The domain can apply and reverse all initial 3×3 face moves deterministically.
- Tests run without a browser or renderer.
- No UI module imports the domain implementation through rendering-specific code.

### Actual progress and verification

- Added logical colors, solved and unassigned states, face coordinates, normalized moves, inverse moves, immutable move application, and solved-state detection.
- Defined face coordinates using an outward-facing row-major view and clockwise turns as viewed from outside the named face.
- Verified all 54 coordinate round trips, all six clockwise face strips, inverse and four-turn identities, a patterned face turn, and solved-state behavior.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run format:check`, `npm.cmd test` (11 tests), and `npm.cmd run build` passed.
- Physical solvability validation and solver integration remain future milestones.

---

## M3 — Three.js 3×3 model and facelet hit mapping

**Status:** Complete and approved.

### Objective and expected outcome

Display a fixed-camera 3×3 model with three visible faces and map clicked visible squares to canonical facelet coordinates.

### Planned files and modules

- `src/rendering/ThreeScene.ts`.
- `src/rendering/CubeRenderer.ts`.
- `src/rendering/CameraController.ts`.
- `src/rendering/faceletMeshes.ts`.
- `src/rendering/raycasting.ts`.
- `src/rendering/rendererTypes.ts`.
- `src/app/components/CubeViewport.tsx`.
- `tests/unit/rendering/`.
- Browser smoke tests under `tests/e2e/`.

### Dependencies

M2.

### Implementation order

1. Create a Three.js scene, fixed camera, renderer, lights, and canvas lifecycle.
2. Render the white 3×3 cube with visible facelet boundaries.
3. Assign stable metadata to each clickable facelet.
4. Implement pointer coordinate conversion and raycasting.
5. Map a hit through the current display orientation to canonical coordinates.
6. Add resize handling and renderer disposal.

### Testing and validation

- Browser opens the scene without console errors.
- Three faces are visible at the expected initial orientation.
- Clicking each visible square reports the correct canonical coordinate.
- Resizing the browser does not distort or break hit testing.
- Renderer cleanup does not leak canvases or animation loops.

### Acceptance criteria

- The user can inspect a white 3×3 cube and click a facelet with a reliable coordinate result.
- No click changes the logical cube state yet; this milestone proves rendering and mapping only.

### Actual progress

- Added a fixed-camera Three.js cube, shared facelet geometry, raycasting, resize handling, and resource disposal.
- Added a visible facelet-coordinate readout without changing cube state.
- Added a raycasting test covering all 27 initially visible facelet centers.
- Type-check, lint, formatting, 12 tests, and production build pass.
- User manually verified browser rendering, facelet selection, resize behavior, and refresh; all checks passed. Automated resource-lifecycle verification remains a future improvement.

---

## M4 — Palette painting and animated view navigation

**Status:** Complete and approved.

### Objective and expected outcome

Implement the complete 3×3 editing workflow.

### Planned files and modules

- `src/app/components/Palette.tsx`.
- `src/app/components/ViewControls.tsx`.
- `src/app/components/EditorStatus.tsx`.
- `src/app/session/sessionState.ts`.
- `src/app/session/sessionReducer.ts`.
- `src/app/session/commands.ts`.
- `src/rendering/ViewRotationController.ts`.
- `src/domain/cube/inputState.ts`.
- Tests for session transitions and painting.

### Dependencies

M3.

### Implementation order

1. Add six fixed palette buttons and selected-color state.
2. Connect facelet hits to single-square painting.
3. Ensure recoloring replaces the previous value.
4. Keep unassigned and white values distinct.
5. Add fixed-camera cube-group rotations.
6. Animate 90-degree view rotations and update visible-face orientation.
7. Allow access to all six faces.
8. Add completeness/count indicators without adding persistence.

### Testing and validation

- Clicking a square changes only that square.
- Repainting changes only the selected square.
- Rotation changes the visible faces but not the logical colors.
- Repeated view rotations return to the original orientation.
- All six faces can be painted.
- Refreshing the page does not restore the entry.

### Acceptance criteria

- A user can manually reproduce a complete 3×3 scramble using the 3D editor.
- No drag painting is possible or required.
- The editing workflow contains no solver or layer-turn behavior.

### Actual progress and verification

- Added six selectable colors, single-facelet painting and recoloring, color counts, and unassigned-facelet tracking.
- Added animated whole-cube rotation controls; input is disabled during animation.
- Added tests for painting, repainting, intentional white, rotated picking, and rotation persistence.
- Type-check, lint, formatting, production build, and 17 tests pass. Vite reports its existing large-bundle warning.
- User manually verified painting, recoloring, intentional white, all-face navigation, animated rotations, color persistence during rotation, and refresh behavior; all checks passed.

---

## M5 — 3×3 validation

The original fixed-orientation and generic-message behavior below was superseded by the approved orientation and feedback fix recorded under M6.

**Status:** Complete and approved.

### Objective and expected outcome

Reject incomplete or physically impossible 3×3 states and allow only valid states to proceed.

### Planned files and modules

- `src/domain/validation/validationTypes.ts`.
- `src/domain/validation/validateCompleteness.ts`.
- `src/domain/validation/validateColorCounts.ts`.
- `src/domain/validation/validateCenters.ts`.
- `src/domain/validation/faceletsToPieces.ts`.
- `src/domain/validation/validatePieces.ts`.
- `src/app/components/ValidationMessage.tsx`.
- `tests/unit/domain/validation/`.

### Dependencies

M4.

### Implementation order

1. Reject unassigned facelets.
2. Validate nine instances of each color.
3. Validate the fixed center arrangement.
4. Extract and identify corner pieces.
5. Extract and identify edge pieces.
6. Check corner orientation, edge orientation, and permutation parity.
7. Connect validation to the Solve action.
8. Display only `Invalid state. Try again.` for invalid input.

### Testing and validation

- Solved state is valid.
- Known legal scrambles are valid.
- Missing facelets are invalid.
- Wrong color counts are invalid.
- Swapped single pieces are invalid where parity rules reject them.
- Twisted corners and flipped edges are invalid.
- The UI does not start solving for invalid input.

### Acceptance criteria

- The validator accepts a comprehensive legal-state fixture set and rejects an intentional invalid-state fixture set.
- Invalid input produces the required generic message and preserves editing.

### Actual progress and verification

- Added completeness, color-count, fixed-center, piece identity, corner orientation, edge orientation, and permutation-parity checks.
- Added the Solve button with the specified invalid-state message; valid input is acknowledged without running a solver.
- Tested 1,200 successive legal moves and targeted impossible configurations, plus invalid and valid UI paths.
- Type-check, lint, formatting, 26 tests, and production build pass. The existing Vite bundle-size warning remains.
- User manually verified the validation workflow and approved the milestone; solver execution remains M6.

---

## M6 — Solver Worker and verified solution generation

**Status:** Complete and approved.

### Objective and expected outcome

Calculate a correct 3×3 solution locally without freezing the browser and verify it before exposing it.

### Planned files and modules

- `src/solver/Solver.ts`.
- `src/solver/SolverResult.ts`.
- `src/solver/threeByThreeSolverAdapter.ts`.
- `src/solver/solverInputConversion.ts`.
- `src/solver/solutionVerifier.ts`.
- `src/workers/solver.worker.ts`.
- `src/app/components/SolveStatus.tsx`.
- `src/app/components/MoveList.tsx`.
- `tests/unit/solver/`.
- `tests/integration/solver-worker/`.

### Dependencies

M5.

### Implementation order

1. Select and pin the 3×3 solver dependency or implement the first solver adapter.
2. Convert canonical facelets into the solver representation.
3. Convert solver output into internal move objects.
4. Implement the replay verifier.
5. Move solving into a Web Worker.
6. Lock editing controls while solving.
7. Expose only verified solutions to the UI.
8. Handle worker failure without exposing cancellation.

### Testing and validation

- Solved state returns an empty solution or equivalent completed result.
- Known scrambles produce solutions that replay to solved.
- Facelet mapping is tested against independently constructed fixtures.
- The worker returns structured success and failure messages.
- The main thread remains responsive during solving.
- A deliberately corrupted solver result is rejected by verification.

### Acceptance criteria

- A valid 3×3 state produces a verified solution.
- An invalid state never reaches the worker.
- The solution is not displayed until replay verification succeeds.

### Actual progress and verification

- Added a pinned local solver behind an adapter and a dedicated Web Worker.
- Added independent move replay before returning a solution, structured worker responses, editing locks, failure handling, move display, and a New Cube action.
- The solved-state, generated-scramble, independent facelet fixture, invalid-input, corrupted-result, and UI worker-mock tests pass.
- Type-check, lint, formatting, production build, and 31 tests pass. The existing Vite bundle-size warning remains.
- The Chromium end-to-end worker test passed; the user also tested a scramble against an online solver, and both move sequences were replayed successfully against the online cube state. Animated playback remains M7.
- Approved follow-up fix implemented: support all 24 whole-cube orientations of the fixed color scheme, distinguish unassigned facelets with dots, and show specific validation guidance. All 34 tests, type-check, lint, formatting, and build pass; browser verification remains pending.
- Review follow-up: added orientation guidance using center colors, enabled view rotation after solving, added a two-minute worker failure watchdog, and added a Chromium end-to-end test. Browser test passed on two reruns after an initial timeout; additional cross-browser and physical-cube verification remains pending.

---

## M7 — Interactive move playback

**Status:** Complete and approved.

### Objective and expected outcome

Turn a verified move list into a guided, one-move-at-a-time 3D solving experience.

### Planned files and modules

- `src/playback/playbackState.ts`.
- `src/playback/playbackController.ts`.
- `src/rendering/LayerAnimationController.ts`.
- `src/rendering/moveHighlight.ts`.
- `src/app/components/PlaybackControls.tsx`.
- `src/app/components/MoveIndicator.tsx`.
- `src/app/components/DirectionArrow.tsx`.
- `tests/unit/playback/`.
- `tests/e2e/playback/`.

### Dependencies

M6.

### Implementation order

1. Display the full move list and current index.
2. Define the affected layer for each normalized move.
3. Highlight the affected face/layer and direction.
4. Animate exactly one move on `Next`.
5. Commit the logical move after animation completion.
6. Disable `Next` during animation.
7. Add adjustable animation speed.
8. Detect the final solved state and expose `New Cube`.

### Testing and validation

- One click advances exactly one move.
- A second click during animation cannot skip a move.
- The visual state and domain state agree after every move.
- Move indicators and arrows match the normalized move.
- Speed changes affect duration but not the move order.
- The final state is solved.

### Acceptance criteria

- A user can follow a complete 3×3 solution interactively from scramble to solved digital cube.
- Playback is not a passive video and never advances multiple moves at once.

### Actual progress and verification

- Added highlighted layers, move notation and directions, one-move animation, adjustable speed, playback progress, and solved-state confirmation.
- Logical moves commit after animation; move and view controls are locked while they would conflict. New Cube appears on completion or a playback error.
- Automated layer geometry tests check every sticker destination for all face turns. A Chromium test enters a scramble, solves it, and advances through the entire solution.
- Owner approved M7. Physical-cube verification and broader browser coverage remain planned for M8.

---

## M8 — End-to-end hardening and 3×3 MVP release

**Status:** In progress; local verification passed, GitHub Actions and clean-clone verification pending.

### Objective and expected outcome

Make the 3×3 vertical slice reliable, documented, and distributable.

### Planned files and modules

- Updates to all previous modules.
- `tests/e2e/complete-solve.spec.ts`.
- `tests/fixtures/cubes/`.
- `.github/workflows/ci.yml`.
- Deployment/build documentation in `README.md`.
- Optional `LICENSE` after project-owner decision.

### Dependencies

M7.

### Implementation order

1. Add a fixture suite of known legal and invalid states.
2. Run unit, integration, and browser tests in CI.
3. Test current Chromium, Firefox, and WebKit targets.
4. Profile rendering and solve latency.
5. Test refresh, browser resize, and WebGL initialization failure paths.
6. Review dependencies and licenses.
7. Build and smoke-test the production artifact.
8. Update documentation and mark the 3×3 MVP complete.

### Testing and validation

- Full automated suite passes from a clean checkout.
- Production build runs without a development server.
- Complete user flow works on supported browsers.
- No runtime network request is required.
- No incomplete state is persisted.

### Acceptance criteria

- The 3×3 MVP meets every requirement in the MVP section of `REQUIREMENTS.md`.
- A friend can clone the repository, follow the setup instructions, and run the application.

### Actual progress and verification

- Existing validator tests cover legal scrambles and invalid center, orientation, piece, and parity cases.
- Added Chromium, Firefox, and WebKit coverage for the complete flow, resize, refresh, loss of network after loading, and unavailable WebGL. The complete-flow test checks for external requests.
- All nine browser tests passed against both development and production servers on the development machine. Type-check, lint, formatting, 36 unit/component tests, and production build passed.
- Added a GitHub Actions workflow and production verification instructions. The workflow has not yet run on GitHub; clean-clone and physical-cube verification remain pending. Performance profiling and full dependency maintenance/license review remain outstanding. Vite reports a large bundle warning.
- Updated Vitest and TypeScript ESLint after an npm audit, with a scoped minimatch override. npm audit reports zero vulnerabilities. All 36 unit tests and build/lint/format checks passed; Firefox and WebKit browser tests passed, and Chromium passed on retry after one solver timeout. The intermittent Chromium timeout remains under observation.

---

## M9 — NxN domain and notation extension for 4×4

### Objective and expected outcome

Generalize the logical state, move model, renderer contracts, and UI size selection for 4×4 without claiming that solving is complete yet.

### Planned files and modules

- `src/domain/nxn/`.
- Generalized coordinate and move modules.
- 4×4 rendering configuration.
- Extended notation formatter/parser.
- Size capability registry.
- New unit fixtures.

### Dependencies

M8.

### Implementation order

1. Generalize facelet dimensions from fixed 3 to `N`.
2. Introduce 4×4-capable move and layer descriptors.
3. Add size-specific renderer configuration.
4. Add wide and inner-layer notation types.
5. Enable 4×4 selection only behind tested capability flags.
6. Add 4×4 completeness and color-count validation.

### Testing and validation

- 3×3 behavior remains unchanged.
- 4×4 facelet counts and moves are correct.
- Wide and inner-layer moves serialize and deserialize consistently.
- Four-facelet center regions are represented correctly.

### Acceptance criteria

- A 4×4 state can be entered and represented correctly, even if solving remains disabled until M10.

---

## M10 — 4×4 solving, parity, and playback

### Objective and expected outcome

Support a correct 4×4 reduction solver, including legal parity cases, with the existing playback system.

### Planned files and modules

- `src/solver/fourByFour/`.
- Center-solving logic.
- Edge-pairing logic.
- Reduced-3×3 conversion.
- Parity algorithms.
- 4×4 fixtures and tests.

### Dependencies

M9 and the stable 3×3 solver pipeline from M6–M8.

### Implementation order

1. Define 4×4 piece and center representations.
2. Implement center construction.
3. Implement edge pairing.
4. Reduce the state to the 3×3 solver contract.
5. Detect and resolve parity cases.
6. Verify complete solutions by replay.
7. Extend notation, highlighting, and animation for multiple layers.

### Testing and validation

- Known 4×4 scrambles solve to a solved state.
- Center and edge-pairing intermediate states are verified.
- Both parity cases have fixtures.
- Long solutions remain playable one move at a time.

### Acceptance criteria

- 4×4 solving is enabled only after legal-state validation and complete replay verification pass.

---

## M11 — 5×5 and generalized reduction foundations

### Objective and expected outcome

Extend reduction concepts to odd cubes and establish reusable center, edge, parity, and notation abstractions.

### Dependencies

M10.

### Implementation order

1. Generalize center representation for odd cubes.
2. Generalize edge grouping and pairing.
3. Reuse the reduced 3×3 solver.
4. Add 5×5 parity and validation fixtures.
5. Verify rendering and playback for multi-layer moves.

### Testing and validation

- 5×5 known states solve correctly.
- Center and edge reduction invariants are tested.
- Existing 3×3 and 4×4 suites remain green.

### Acceptance criteria

- 5×5 support is implemented without size-specific duplication of the shared UI workflow.

---

## M12 — 6×6 through 20×20 expansion and performance

### Objective and expected outcome

Add the remaining supported cube sizes only after measuring solver and renderer behavior at each size.

### Dependencies

M11.

### Implementation order

1. Add generalized even/odd center and edge strategies.
2. Add size capability flags one size at a time.
3. Benchmark memory, frame rate, and solve time.
4. Introduce instanced or surface-optimized rendering where measurements require it.
5. Add long-solution navigation and progress indicators.
6. Validate each size with generated and fixture states.

### Testing and validation

- Each size has valid-state, invalid-state, move, and solved-state fixtures.
- Rendering remains usable at the target size.
- Worker solving does not freeze the main thread.
- Every returned solution passes replay verification.

### Acceptance criteria

- A size is enabled only when its validation, solving, rendering, and playback criteria are met.
- 20×20 support is not advertised merely because the UI accepts the number; it must pass the complete correctness and performance checks.

## Milestone completion and Git workflow

At the end of every milestone:

1. Run the milestone's tests and the full regression suite.
2. Review the diff and remove generated files.
3. Update this roadmap's status and the README if user-facing behavior changed.
4. Commit only the completed milestone.
5. Push the feature branch and open a pull request when collaborating.
6. Merge into `main` only after checks pass.

The commit message should describe the milestone, for example:

```text
Implement 3x3 cube state and move engine
```

