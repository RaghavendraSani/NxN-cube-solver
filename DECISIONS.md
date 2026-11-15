# CubeSolver decision record

This document explains the project's decisions and the tradeoffs behind them. It is a companion to [REQUIREMENTS.md](REQUIREMENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md), and [flow.md](flow.md); it does not replace their requirements or acceptance criteria. Update it when a decision changes and record what it supersedes.

The original records do not always state why one option was chosen. Where the reason is a consequence inferred from the design rather than an explicitly recorded historical reason, this document labels it **inference**. An alternative mentioned for context was not necessarily formally evaluated.

## Product and deployment

### D-01 — Local, client-only application (ADR-001)

**Decision:** Run the application in the browser and solve locally. Do not add a backend, database, authentication, analytics, or cloud service implicitly. Bundle runtime code locally and avoid a runtime CDN.

**Why:** The approved product is an offline personal learning project; local execution avoids server infrastructure and transmission of cube states. A local static server may still be needed to load the built files and worker; the current build does not provide an offline cache after that server is disconnected.

**Alternative:** A server-side solver could centralize heavy computation but would change the offline and privacy assumptions and require infrastructure.

### D-02 — In-memory sessions (ADR-007)

**Decision:** Do not persist incomplete cube entries or playback progress. Refresh or a new session discards the in-memory state.

**Why:** This is an explicit product constraint and keeps the session model simple. **Inference:** It also avoids migration and storage-management behavior for unfinished sessions.

**Alternative:** Local storage, IndexedDB, or cloud sync could resume an entry, but requires an approved requirements change.

### D-03 — Manual, single-facelet entry

**Decision:** Use six fixed palette colors. Select a color and click one sticker; clicking a previously assigned sticker recolors it. There is no drag painting or camera scanning.

**Why:** This is the approved, predictable input workflow; one click changes exactly one logical facelet. Camera permissions and image processing are outside the approved scope.

**Alternative:** Drag painting or camera entry could reduce input effort, but changes interaction or product scope and needs a requirements decision.

### D-04 — Supported sizes and incremental delivery (ADR-008)

**Decision:** Establish 3×3 as the first complete slice, then add larger sizes incrementally. The current application exposes 3×3 and 4×4; 5×5 is in progress and disabled. The roadmap targets sizes through 20×20, but 2×2 is out of scope.

**Why:** Each size must have adequate validation, solving, rendering, playback, and tests before it is enabled. A general NxN state representation alone is not evidence of a working solver.

**Alternative:** Enabling every size as soon as it can be rendered would present capabilities that have not been verified.

## Technology and boundaries

### D-05 — TypeScript, React, Vite, and plain CSS (ADR-002)

**Decision:** Use strict TypeScript, React for the UI, Vite for development and static builds, and plain CSS rather than a UI framework. Use npm and a lockfile for reproducible dependencies.

**Why:** The architecture selects typed interfaces, UI composition, and static builds while keeping the initial dependency set small. The source documents do not record a comparative evaluation of other frontend frameworks.

### D-06 — Direct Three.js behind a renderer boundary (ADR-003)

**Decision:** Use Three.js directly through rendering modules instead of using React Three Fiber. Keep the camera fixed and animate the cube group for view rotation. Use raycasting for facelet selection.

**Why:** The architecture explicitly favors precise imperative control over layer selection, raycasting, and sequential animation. The renderer visualizes state and does not own cube business rules.

**Alternative:** React Three Fiber could express the scene declaratively, but was not selected for the initial implementation.

### D-07 — Framework-independent domain and size-specific solver adapters (ADR-009)

**Decision:** Keep cube state, coordinates, moves, validation, and conversion independent of React and Three.js. Isolate each solver and its representation behind an adapter.

**Why:** Pure domain code can be tested without a browser and solver implementations can change without rewriting the UI or renderer.

**Alternative:** Putting rules in components or binding the application to one solver's data model would couple correctness to presentation or a dependency.

### D-08 — Worker-based solving (ADR-005)

**Decision:** Execute supported solvers in a Web Worker. The UI has no user cancellation control; worker errors and an internal timeout are handled as failures.

**Why:** A worker keeps the browser's main thread responsive, while the non-cancellable workflow is an explicit requirement. The watchdog prevents an indefinitely stuck session.

**Alternative:** Main-thread solving risks freezing rendering. User cancellation is not approved merely because worker termination exists for internal cleanup.

### D-09 — Validate before solving and replay before display (ADR-006)

**Decision:** Check entered states before solving and independently apply the returned moves to a copied domain state. Show a solution only when replay reaches a solved cube. Solving correctness takes priority over shortest length.

**Why:** A solver result or dependency must not be trusted without checking it against the application's own state representation. The 4×4 worker path performs another replay check before returning a result.

**Alternative:** Displaying solver output immediately would be faster to integrate but could show incorrect moves when conversion or solver output is wrong.

## Cube model and interaction

### D-10 — Canonical state separate from display orientation (ADR-004)

**Decision:** Store logical facelet state separately from view rotation and animation. The renderer maps pointer hits to canonical facelet addresses.

**Why:** Rotating the view to reach another face must never alter the entered scramble. Separation also keeps move application and validation independent of the 3D scene.

### D-11 — Explicit unassigned color and orientation handling (ADR-011)

**Decision:** Use logical color identifiers and a distinct `unassigned` value. Unassigned stickers look white but carry a dot. Accept any proper whole-cube orientation of the fixed supported color scheme and map colors by centers for 3×3 validation and solver input while retaining the entered face coordinates for output.

**Why:** An intentionally white sticker must count differently from an unpainted sticker. Accepting proper orientations avoids requiring the physical cube to be held in one fixed global orientation.

**Alternative:** Treating white as unassigned would make a genuine white entry ambiguous; accepting arbitrary color schemes is not currently in scope. Earlier generic invalid feedback was superseded by specific guidance.

### D-12 — Centralized coordinates and normalized moves

**Decision:** Store faces in `U, R, F, D, L, B` order, with facelets row-major as seen from outside each face. Centralize face basis vectors and coordinate conversions. NxN moves identify face, starting layer, width, and turn amount; even-sized cubes use doubled coordinates to avoid fractions. Shared rotation mathematics is used by 3×3 and NxN move application.

**Why:** Central conventions prevent renderer, solver, and domain code from silently disagreeing about orientation. Doubled coordinates represent both odd and even cube positions with integers.

**Alternative:** Duplicating mappings in each subsystem or using floating-point half-coordinates would make consistency harder to verify. This tradeoff is an inference from the implementation and architecture.

### D-13 — One move at a time; commit after animation

**Decision:** Display the move sequence and advance one move per user action. Highlight the affected layer and direction, allow speed adjustment, and commit logical state after animation finishes. Lock conflicting controls while an animation is active.

**Why:** The user can follow each move on a physical cube, and the logical state does not advance before the visual step completes.

**Alternative:** Automatic video-style playback or committing at animation start would change the approved interaction or risk a visual/logical mismatch.

## Solver choices and limitations

### D-14 — 3×3 adapter (ADR-010)

**Decision:** Use `@turnwise/cube-solver` 1.0.1 behind the 3×3 adapter. The recorded review identifies Apache-2.0 licensing and no runtime dependencies; independently replay its output.

**Why:** It provides a local solver behind the selected interface. The architecture mentions `cubing.js` as an earlier candidate but does not record a detailed comparative benchmark; the selected package was relatively new and should be reviewed when updated.

### D-15 — Vendored 4×4 adapter (ADR-012)

**Decision:** Keep a pinned copy of the relevant MIT-licensed `@cubesmith/scrambler` 0.15.0 source behind the 4×4 adapter, with provenance and license preserved. Verify solutions by replay.

**Why:** The package did not expose its 4×4 solver through its public API. Vendoring the relevant source made the solver callable without coupling the rest of the application to its internals.

**Limitations:** Owner approval enabled 4×4 despite remaining uncertainty: its validator has not been formally verified, success for every legal state is not established, and physical-cube verification remains pending. See the [roadmap](ROADMAP.md) and [reachability review](docs/4x4-reachability-review.md). A solver may fail or time out; verified replay does not guarantee it will find a solution for every legal input.

### D-16 — 5×5 and NxN reduction direction (M11, in progress)

**Decision:** First evaluate a suitable offline solver accepting a manually entered state. If none is suitable, build project-owned reduction: solve centers, pair edges, then solve the reduced 3×3 and replay the full solution. Keep the 5×5 option disabled until validation, solving, rendering, playback, and required tests meet the roadmap criteria. Do not enable 6×6 or larger as part of M11.

**Why:** This was the approved M11 plan and maintains the offline, worker, adapter, and verification boundaries. The owner chose to continue this plan after considering an externally supplied NxN solver.

**Current implementation:** Standalone 5×5 notation, piece-orbit grouping, preliminary entry checks, bounded center and edge searches, and a guarded reduced-5×5-to-3×3 handoff exist. `solveFive` combines those stages and replays its result, but the search bounds prevent it from handling arbitrary legal scrambles. A development-only `?preview5` path connects that solver to worker, UI, and playback for manual inspection; a one-inner-turn Chromium flow passed. The production size option remains disabled. Complete reachability validation and general solving remain outstanding. Preliminary validation success is not a proof of reachability.

**Alternatives considered:** The existing vendored 4×4 package's 5×5 support is scramble generation, not an arbitrary-state solver. A GPL-3.0-only candidate was not incorporated; its license implications and suitability were not fully resolved. A separate Python/C NxN solver examined later required native subprocesses and separately downloaded tables; the owner decided not to pursue that folder. A later MPL-2.0 gullicube WebAssembly build accepted facelets and was trial-integrated, but both its own Node test and a Chromium edit-to-solve test aborted on this Windows machine before returning moves. The trial integration was removed and the 5×5 option remains disabled. These observations are not a formal legal or exhaustive dependency review.

**Readability preference:** The owner requested clearly identifiable files for each cube size, even where some code is repeated, so the implementation can be explained to a professor. Solvers and validators are organized under `threeByThree`, `fourByFour`, and `fiveByFive`; the application names its 3×3 and 4×4 validation paths explicitly, while common domain and rendering code remains shared where it already serves the same purpose. This organization does not by itself complete or enable the 5×5 solver.

## Verification, delivery, and maintenance

### D-17 — Focused tests with required correctness gates

**Decision:** Maintain unit tests for domain changes, inverse and round-trip checks for coordinate or move changes, replay tests for solver integrations, and browser coverage for the complete workflow. Run type-checking, linting, unit tests, and production build before declaring a milestone complete. The owner requested focused, useful cases rather than adding hundreds of low-value cases.

**Why:** Cube correctness depends on orientation and move mapping; representative legal and intentionally invalid fixtures and replay checks provide evidence at the boundaries. The owner explicitly requested only tests necessary to proceed, rather than separate experimental or redundant tests. The preference does not remove the documented milestone acceptance gates.

### D-18 — Explicitly record release exceptions

**Decision:** The owner approved M8 with physical-cube testing outstanding and an intermittent Chromium solver delay still unexplained. Later browser and CI results are recorded in the roadmap. M9 and M10 were approved with the 4×4 limitations described above.

**Why:** Approval allows development to proceed while keeping unverified claims and unresolved problems visible. Approval is not evidence that the exceptions have been resolved.

### D-19 — Security and dependency hygiene

**Decision:** Pin dependencies in the lockfile, review solver and renderer licenses and maintenance, preserve third-party notices, and avoid runtime CDN code, unsafe HTML injection, `eval`, and secrets in the repository.

**Why:** The client-only architecture relies on locally delivered code and has a small intended attack surface. Full transitive license and maintenance review was recorded as pending in M8; do not infer that a package-level notice completed that review.

### D-20 — Owner-controlled Git workflow and documentation

**Decision:** Keep `main` stable, use focused milestone changes and feature branches when collaborating, review status and diff, and leave commit and push operations to the owner. Update requirements only for deliberate requirement changes, architecture and an ADR for architectural changes, and the roadmap for milestone status or acceptance changes. Maintain [flow.md](flow.md) when execution paths change.

**Why:** These are the owner's contributor instructions. A concise flow trace makes the implemented call path and the current change reviewable; requirements and architecture remain the authoritative records for their respective decisions.
