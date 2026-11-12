# Execution flow

This describes the current implementation. Paths are relative to the repository root.
Arrows show calls or callbacks in execution order; branches and asynchronous boundaries
are called out explicitly. Update this document when an execution path changes.

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

1. The Solve button calls `App.startSolve`. For 3×3 it calls `src/domain/validation/validateCube.ts` → `validateCube`, which checks facelets and colors, calls `centerMapping` and `normalizeColors` in `src/domain/cube/centerMapping.ts`, then checks pieces, orientation, and parity. Invalid input displays guidance and stops.
2. For 4×4, `App` computes `src/domain/nxn/validate4.ts` → `check4Entry`; `startSolve` stops if its status is not `counts-ok`. These are preliminary checks, not a formal proof of reachability.
3. For a permitted entry, `startSolve` constructs a worker and calls `src/solver/workerClient.ts` → `runSolverWorker` or `runFourSolverWorker` → `runWorker`. `runWorker` posts the request and sets timeout and failure handlers.
4. **Worker boundary:** `src/workers/solver.worker.ts` receives the message and calls `src/solver/solveRequest.ts` → `handleSolveRequest`.
5. **3×3 branch:** `handleSolveRequest` → `src/solver/solveCube.ts` → `solveCube` validates again, checks `isSolved`, and converts via `toFaceletString`. It calls the local `@turnwise/cube-solver`, converts its moves, then calls `verifySolution` → `src/domain/cube/applyMove.ts` → `applyMove` for each move → `src/domain/cube/isSolved.ts` → `isSolved`. Only a verified result returns.
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

The vendored solver remains a pinned upstream copy; its internal algorithms are reached through the adapter above. No 5×5 or general NxN solver is enabled.
