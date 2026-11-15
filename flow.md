# Execution flow

This describes the current implementation. Paths are relative to the repository root.
Arrows show calls or callbacks in execution order; branches and asynchronous boundaries
are called out explicitly. Update this document when an execution path changes.

## Solver files by cube size

- `src/solver/threeByThree/solver.ts`: 3×3 conversion, solving, and replay verification.
- `src/solver/fourByFour/solver.ts`: 4×4 solving and replay verification; `convert.ts` translates its state for the vendored solver.
- `src/solver/fiveByFive/solver.ts`: in-progress bounded 5×5 reduction and replay verification, reached by the local preview only.
- `src/solver/solveRequest.ts`: worker-side selection of the 3×3, 4×4, or local-preview 5×5 solver. The shared worker client handles timeout and cleanup.
- Validators are in `src/domain/threeByThree/validate.ts`, `src/domain/fourByFour/validate.ts`, and `src/domain/fiveByFive/validate.ts`; the 5×5 checks remain preliminary.
- Size-specific notation is in `src/domain/fourByFour/notation.ts` and `src/domain/fiveByFive/notation.ts`; the preview uses `formatMove5` for playback.

## Start and render

1. `index.html` loads `src/main.tsx`.
2. `src/main.tsx` finds `#root` and renders `src/app/App.tsx` → `App`.
3. `App` initializes the 3×3 entry with `src/domain/cube/state.ts` → `createUnassignedCube`, and renders `src/app/components/CubeViewport.tsx` → `CubeViewport`.
4. The viewport's effect creates `src/rendering/CubeRenderer.ts` → `CubeRenderer`. Its constructor calls `src/rendering/cubeScene.ts` → `createCubeScene`, attaches the canvas and pointer listener, and calls `resize`.
5. Viewport effects pass state and the highlighted move to `CubeRenderer.setState` and `setHighlight`; these call the matching scene operations and render the canvas. `src/app/app.css` styles the interface.

## Enter and inspect a cube

1. Selecting a size in `App` calls `src/domain/nxn/cube.ts` → `createNxNCube`, replaces the entry, and recreates the viewport. Selecting a palette button sets `selectedColor`.
2. A canvas pointer event calls `CubeRenderer.handlePointer` → `src/rendering/pickFacelet.ts` → `pickFacelet`. The closest sticker supplies its canonical facelet address.
3. The viewport callback forwards the address to `App` → `paint` → `src/domain/cube/inputState.ts` → `paintFacelet`. It checks the address using `faceletToCoordinates` for 3×3 or `toNxNCoordinates` for 4×4 and returns a copied state with one facelet changed.
4. React renders the new state. `App` calls `countColors`; the viewport effect calls `CubeRenderer.setState` → scene `setState` to update stickers and unassigned markers.
5. A view-control button calls `CubeViewport.rotate` → `CubeRenderer.rotate`. Animation frames rotate the scene group, then the completion callback unlocks controls. This does not apply a puzzle move.

## Validate and solve

1. The Solve button calls `App.startSolve` → `validateThreeByThree` for 3×3. It calls `src/domain/threeByThree/validate.ts` → `validateCube`, which checks facelets and colors, calls `centerMapping` and `normalizeColors` in `src/domain/cube/centerMapping.ts`, then checks pieces, orientation, and parity. Invalid input displays guidance and stops.
2. For 4×4, `App` computes `src/domain/fourByFour/validate.ts` → `check4Entry`; `startSolve` passes that status to `validateFourByFour` and stops if it is not `counts-ok`. These are preliminary checks, not a formal proof of reachability.
3. In the local 5×5 preview, `App` calls `src/domain/fiveByFive/validate.ts` → `check5Entry` and `validateFiveByFive`. These checks are preliminary and a valid entry may still exceed the solver's search bounds.
4. For a permitted entry, `startSolve` constructs a worker and calls `src/solver/workerClient.ts` → `runSolverWorker`, `runFourSolverWorker`, or `runFiveSolverWorker` → `runWorker`. `runWorker` posts the request and sets timeout and failure handlers.
4. **Worker boundary:** `src/workers/solver.worker.ts` receives the message and calls `src/solver/solveRequest.ts` → `handleSolveRequest`.
5. **3×3 branch:** `handleSolveRequest` → `src/solver/threeByThree/solver.ts` → `solveCube` validates again, checks `isSolved`, and converts via `toFaceletString`. It calls the local `@turnwise/cube-solver`, converts its moves, then calls `verifySolution` → `src/domain/cube/applyMove.ts` → `applyMove` for each move → `src/domain/cube/isSolved.ts` → `isSolved`. Only a verified result returns.
6. **4×4 branch:** `handleSolveRequest` → `src/solver/fourByFour/solver.ts` → `solveFour`. It calls `check4Entry`, `isNxNSolved`, `solverLayout` and `src/solver/fourByFour/convert.ts` → `convertFourState`; then `vendor/cubesmith/src/puzzles/444/solve.ts` → `solve444`. The adapter converts its output and calls `verifyFourSolution` → `applyNxNMove` for each move → `isNxNSolved`. `handleSolveRequest` calls `verifyFourSolution` again before returning the response.
7. The worker posts the success or failure. `runWorker` cleans up and settles its promise; `App.startSolve` stores verified moves for display or shows an error. A stale worker response is ignored.

## Playback and reset

1. The Next move button calls `App.nextMove` → `src/domain/nxn/cube.ts` → `applyNxNMove` to calculate the next state without committing it.
2. `App.nextMove` calls the viewport handle → `CubeRenderer.animateMove` → scene `beginLayerTurn`. Animation frames call the layer's `setProgress`.
3. At the end of animation, `CubeRenderer.animateMove` calls layer `finish`, updates the displayed scene with the calculated state, and invokes the completion callback. Only then does `App` commit the state and increment the move index. It calls `isNxNSolved` after the last move and reports completion or a playback error.
4. New Cube calls `App.newCube`, returning to a fresh 3×3 entry. On viewport unmount, its effect calls `CubeRenderer.dispose`, which stops animation, removes listeners and disposes scene and WebGL resources.

## Readability cleanup

The readability cleanup that introduced this document changed these runtime call paths:

- `src/domain/cube/applyMove.ts` → `applyMove` and `src/domain/nxn/cube.ts` → `applyNxNMove` now both call the shared `src/domain/cube/coordinates.ts` → `rotateClockwise`; their duplicate local implementations were removed. This affects replay and playback move calculations, not the intended rotation behavior.
- `src/solver/fourByFour/solver.ts` → `solveFour` and `verifyFourSolution` now call `src/domain/nxn/cube.ts` → `isNxNSolved` instead of the removed local `isFourSolved`. This affects the 4×4 solved shortcut and replay verification.
- Other application and test edits in the cleanup add explanatory comments, clarify test variable names, or remove unused CSS selectors. They do not alter the execution path.

The vendored solver remains a pinned upstream copy; its internal algorithms are reached through the adapter above. Production users cannot select 5×5 or a general NxN solver.

## M11 work in progress

`src/domain/fiveByFive/notation.ts` provides `parseMove5` and `formatMove5` for the 5×5 outer, inner-slice, and wide turns. The parser is used by the internal edge search and tests; `App` uses the formatter for preview playback.

`src/domain/fiveByFive/reduce.ts` → `reduce5To3` checks color counts, calls `areFiveEdgesPaired`, checks reduced centers, extracts the 3×3 facelets, and calls `src/domain/threeByThree/validate.ts` → `validateCube`. It does not perform center reduction or edge pairing.

`src/solver/fiveByFive/reducedSolver.ts` → `solveReducedFive` calls `reduce5To3`, then `src/solver/threeByThree/solver.ts` → `solveCube`, converts the returned outer turns, and replays them with `applyNxNMove` → `isNxNSolved` on the full 5×5. This path is currently called by tests only and rejects unreduced states.

`src/domain/fiveByFive/pieces.ts` → `pieces5` calls `toNxNCoordinates` to group stickers by physical cubie and classify center and edge orbits. Preliminary validation uses this mapping in the local preview and tests.

`src/domain/fiveByFive/validate.ts` → `check5Entry` uses `pieces5`, `countColors`, and `centerMapping` to check necessary entry conditions. `wingIdentities` uses the sticker normals and positions to check wing handedness. The validator then projects fixed centers, middle edges, and corners to `validateCube` for 3×3 orientation and parity checks. This preliminary path is called by the local preview and tests; it does not prove complete 5×5 physical reachability.

`src/solver/fiveByFive/centers.ts` → `findFiveCenterMoves` calls `check5Entry`, then searches center-only permutations computed from domain coordinates for a bounded set of outer and inner moves. It prunes branches using a misplaced-center lower bound and, for deeper searches, exact per-color X- and T-center pattern tables built by `centerDistances`. It replays a candidate with `applyNxNMove` → `areFiveCentersSolved` and returns moves or `null` on search exhaustion. It is reached through `solveFive` in the preview worker; it does not provide general center reduction.

`src/solver/fiveByFive/edges.ts` → `findFiveEdgePairing` searches increasing numbers of applications of one center-restoring sequence and its inverse, in 24 cube orientations with outer-turn setups, within a node budget. It skips states already explored with at least as many remaining steps, then calls `verifyFiveEdgePairing`. The verifier calls `check5Entry` and `areFiveCentersSolved`, replays candidate moves with `applyNxNMove`, then checks `areFiveCentersSolved` and `areFiveEdgesPaired`. It is reached through `solveFive` in the preview worker; its limited coverage does not provide general edge pairing.

`src/solver/fiveByFive/solver.ts` → `solveFive` calls `check5Entry` → `findFiveCenterMoves` → `findFiveEdgePairing` → `solveReducedFive`, applying each stage's moves to a copy. It replays the combined moves against the original with `applyNxNMove` → `isNxNSolved`. Bounded search exhaustion throws. This path is reached by the local preview worker and by tests.

## Local 5×5 preview path changed in this update

In a development build opened with `?preview5`, `src/app/App.tsx` → `App` exposes the 5×5 option. `App.startSolve` calls `validateFiveByFive` with `check5Entry(cube).status`, then `src/solver/workerClient.ts` → `runFiveSolverWorker` → `runWorker`. `src/workers/solver.worker.ts` → `handleSolveRequest` in `src/solver/solveRequest.ts` now dispatches size 5 to `src/solver/fiveByFive/solver.ts` → `solveFive`. After its full-cube replay succeeds, the worker returns moves to `App`; `App` renders them with `formatMove5` and sends each one through the existing `nextMove` → `CubeRenderer.animateMove` → `applyNxNMove` playback path. The exact changed functions are `App`, `validateFiveByFive`, `runFiveSolverWorker`, and `handleSolveRequest`. The 5×5 size remains absent from production builds.
