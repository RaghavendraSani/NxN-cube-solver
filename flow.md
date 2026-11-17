# Execution flow

This describes the current implementation. Paths are relative to the repository root.
Arrows show calls or callbacks in execution order; branches and asynchronous boundaries
are called out explicitly. Update this document when an execution path changes.

## Solver files by cube size

- `src/solver/threeByThree/solver.ts`: 3×3 conversion, solving, and replay verification.
- `src/solver/fourByFour/solver.ts`: 4×4 solving and replay verification; `convert.ts` translates its state for the vendored solver.
- `src/solver/nxn/`: the shared reduction solver for 5×5 through 20×20 (`solveNxN.ts`), with `macros.ts`, `conjugator.ts` and `reduction.ts` as its stages. `src/solver/fiveByFive/solver.ts` is a one-line entry point that names size 5 for readers.
- `src/solver/solveRequest.ts`: worker-side selection of the 3×3, 4×4, or N×N solver. The shared worker client handles timeout and cleanup.
- Validators are in `src/domain/threeByThree/validate.ts`, `src/domain/fourByFour/validate.ts`, and `src/domain/nxn/validate.ts` (`checkNxNEntry`, used for every size from 5 up; `src/domain/fiveByFive/validate.ts` is a one-line entry point).
- Notation: `src/domain/fourByFour/notation.ts` (kept for the 4×4 tests) and `src/domain/nxn/notation.ts` → `formatMoveN`, which the application uses for every size.
- Pure cube mathematics shared by validation and solving lives in `src/domain/nxn/`: `engine.ts` (sticker permutation tables), `orbits.ts` (piece and orbit structure), `invariants.ts` (scheme, corner and wing parities), `applyMoves.ts` and `example.ts`.

## Start and render

1. `index.html` loads `src/main.tsx`.
2. `src/main.tsx` finds `#root` and renders `src/app/App.tsx` → `App`.
3. `App` initializes the 3×3 entry with `src/domain/cube/state.ts` → `createUnassignedCube`, and renders `src/app/components/CubeViewport.tsx` → `CubeViewport`.
4. The viewport's effect creates `src/rendering/CubeRenderer.ts` → `CubeRenderer`. Its constructor calls `src/rendering/cubeScene.ts` → `createCubeScene`, attaches the canvas and pointer listener, and calls `resize`.
5. Viewport effects pass state and the highlighted move to `CubeRenderer.setState` and `setHighlight`; these call the matching scene operations and render the canvas. `src/app/app.css` styles the interface.

## Enter and inspect a cube

1. Selecting a size in `App` calls `src/domain/nxn/cube.ts` → `createNxNCube`, replaces the entry, and recreates the viewport. Selecting a palette button sets `selectedColor`.
2. A canvas pointer event calls `CubeRenderer.handlePointer` → scene `pick`, which raycasts the sticker instances and maps the hit instance to its canonical facelet address.
3. The viewport callback forwards the address to `App` → `paint` → `src/domain/cube/inputState.ts` → `paintFacelet`. It checks the address using `faceletToCoordinates` for 3×3 or `toNxNCoordinates` for larger cubes and returns a copied state with one facelet changed.
4. React renders the new state. `App` calls `countColors`; the viewport effect calls `CubeRenderer.setState` → scene `setState` to update stickers and unassigned markers.
5. A view-control button calls `CubeViewport.rotate` → `CubeRenderer.rotate`. Animation frames rotate the scene group, then the completion callback unlocks controls. This does not apply a puzzle move.

## Validate and solve

1. The Solve button calls `App.startSolve` → `validateThreeByThree` for 3×3. It calls `src/domain/threeByThree/validate.ts` → `validateCube`, which checks facelets and colors, calls `centerMapping` and `normalizeColors` in `src/domain/cube/centerMapping.ts`, then checks pieces, orientation, and parity. Invalid input displays guidance and stops.
2. For 4×4, `App` computes `src/domain/fourByFour/validate.ts` → `check4Entry`; `startSolve` passes that status to `validateFourByFour` and stops if it is not `counts-ok`. These are preliminary checks, not a formal proof of reachability.
3. For 5×5 and larger, `App` computes `src/domain/nxn/validate.ts` → `checkNxNEntry` (memoized) and `validateLargeCube` maps its status to guidance. The checks are the complete cube invariants, and the stress tests confirm that every accepted state solves.
4. For a permitted entry, `startSolve` constructs a worker and calls `src/solver/workerClient.ts` → `runSolverWorker`, `runFourSolverWorker`, or `runNxNSolverWorker` → `runWorker`. `runWorker` posts the request and sets timeout and failure handlers.
5. **Worker boundary:** `src/workers/solver.worker.ts` receives the message and calls `src/solver/solveRequest.ts` → `handleSolveRequest`.
6. **3×3 branch:** `handleSolveRequest` → `src/solver/threeByThree/solver.ts` → `solveCube` validates again, checks `isSolved`, and converts via `toFaceletString`. It calls the local `@turnwise/cube-solver`, converts its moves, then calls `verifySolution` → `src/domain/cube/applyMove.ts` → `applyMove` for each move → `src/domain/cube/isSolved.ts` → `isSolved`. Only a verified result returns.
7. **4×4 branch:** `handleSolveRequest` → `src/solver/fourByFour/solver.ts` → `solveFour`. It calls `check4Entry`, `isNxNSolved`, `solverLayout` and `src/solver/fourByFour/convert.ts` → `convertFourState`; then `vendor/cubesmith/src/puzzles/444/solve.ts` → `solve444`. The adapter converts its output and calls `verifyFourSolution` → `applyNxNMove` for each move → `isNxNSolved`. `handleSolveRequest` calls `verifyFourSolution` again before returning the response.
8. **N×N branch (5 ≤ N ≤ 20):** `handleSolveRequest` → `src/solver/nxn/solveNxN.ts` → `solveNxN`. It reads the sticker array with `NxNEngine.fromState`, derives the color scheme (`deriveScheme`: fixed centers for odd cubes, the UFR corner for even cubes) and the corner parity, then builds the target arrangement (`targetStickers`, one outer R turn when the corner parity is odd). `wingParities` finds wing orbits with odd permutation parity; each is corrected by one inner slice turn (`kickFor`). `reduction.ts` → `solveCenters` then repairs every center orbit and `solveWings` every wing orbit. Both pick, from the conjugation table of the orbit (`conjugator.ts` → `Conjugator`, built over the pure macro that `macros.ts` → `findBaseMacros` found), the 3-cycle `W⁻¹·M·W` that fixes the most pieces. `projectReduced` then reads the reduced 3×3 (corners, one wing per edge, one center), `src/solver/threeByThree/solver.ts` → `solveCube` solves it, and its face turns become outer-layer moves. `simplifyMoves` merges and normalizes the full sequence, and `replay` / `stickersSolved` check it on the whole cube before it returns.
9. The worker posts the success or failure. `runWorker` cleans up and settles its promise; `App.startSolve` stores verified moves for display or shows an error. A stale worker response is ignored.

## Playback and reset

1. The Next move button calls `App.nextMove` → `src/domain/nxn/applyMoves.ts` → `applyMovesFast` to calculate the next state without committing it.
2. `App.nextMove` calls the viewport handle → `CubeRenderer.animateMove` → scene `beginLayerTurn`. Animation frames call the layer's `setProgress`, which rotates only the affected sticker and body instances.
3. At the end of animation, `CubeRenderer.animateMove` calls layer `finish`, updates the displayed scene with the calculated state, and invokes the completion callback. Only then does `App` commit the state and increment the move index. It calls `isNxNSolved` after the last move and reports completion or a playback error.
4. Auto-play is an effect in `App` that calls `nextMove` again whenever an animation ends, so it still animates one move at a time. For solutions longer than 30 moves, Skip 10, Skip 100, and Go to move call `App.skipTo`, which applies the intervening moves with `applyMovesFast`, commits the state, and does not animate. The final-state check is the same.
5. New Cube calls `App.newCube`, returning to a fresh 3×3 entry. On viewport unmount, its effect calls `CubeRenderer.dispose`, which stops animation, removes listeners and disposes scene and WebGL resources. Zoom in and Zoom out call `CubeRenderer.zoom`, which only moves the camera.

## Readability cleanup

The readability cleanup that introduced this document changed these runtime call paths:

- `src/domain/cube/applyMove.ts` → `applyMove` and `src/domain/nxn/cube.ts` → `applyNxNMove` now both call the shared `src/domain/cube/coordinates.ts` → `rotateClockwise`; their duplicate local implementations were removed. This affects replay and playback move calculations, not the intended rotation behavior.
- `src/solver/fourByFour/solver.ts` → `solveFour` and `verifyFourSolution` now call `src/domain/nxn/cube.ts` → `isNxNSolved` instead of the removed local `isFourSolved`. This affects the 4×4 solved shortcut and replay verification.
- Other application and test edits in the cleanup add explanatory comments, clarify test variable names, or remove unused CSS selectors. They do not alter the execution path.

The vendored solver remains a pinned upstream copy; its internal algorithms are reached through the adapter above. Sizes 5×5 through 20×20 use the project-owned reduction solver described above; the vendored solver is used for 4×4 only.

## M11 work in progress

## 5×5 to 20×20 update (M11 and M12)

The bounded 5×5 search modules (`centers.ts`, `edges.ts`, `reduce.ts`, `pieces.ts`, `reducedSolver.ts`, `notation.ts`) and the `?preview5` path were removed. Their role is now filled by:

- `src/domain/nxn/engine.ts` → `NxNEngine`: sticker permutation tables for every layer turn, built once per size from `rotateClockwise`; tests compare it sticker by sticker with `applyNxNMove`.
- `src/domain/nxn/orbits.ts` → `NxNStructure`: pieces, mates and the orbits that layer turns cannot mix.
- `src/solver/nxn/macros.ts` → `findBaseMacros`: searches the commutators `[U, S·Q·S']` for sequences whose complete effect is one 3-cycle of centers or three whole wings.
- `src/solver/nxn/conjugator.ts` → `Conjugator`: a breadth-first table of the images of three stickers; the word `W` found for a triple gives the pure macro `W⁻¹·M·W` on exactly that triple.
- `src/rendering/cubeScene.ts` → `createCubeScene`: four instanced meshes plus a core block, so draw calls do not grow with the cube size.
