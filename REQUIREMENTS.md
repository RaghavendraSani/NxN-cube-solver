 # CubeSolver Requirements

**Status:** Approved baseline  
**Product type:** Offline browser application  
**Initial release:** 3×3×3 cube  
**Future range:** 4×4×4 through 20×20×20

## 1. Product goal

CubeSolver helps a user reproduce the visible state of a physical Rubik's Cube, determine whether that state is physically solvable, calculate a correct solution, and follow the solution through an interactive 3D model.

## 2. Scope

### In scope

- Standard cubic NxN puzzles, beginning with 3×3×3.
- Manual facelet entry through a 3D cube.
- Six fixed colors.
- Animated display rotation with a fixed camera.
- Full 3×3 validation.
- Local solution calculation.
- Standard 3×3 move notation.
- One-move-at-a-time solution playback.
- Adjustable animation speed.
- Incremental support for larger cube sizes.

### Out of scope for the MVP

- Camera scanning.
- 2×2×2 cubes.
- Backend services and accounts.
- Cloud synchronization or saved sessions.
- Continuous camera-based move verification.
- Video-style playback.
- Custom color schemes.
- Required color-blind accessibility features.
- Optimized 20×20 solving in the first release.

## 3. User workflow

1. Select a supported cube size.
2. See an initially white 3D cube.
3. Select one of six fixed palette colors.
4. Click one visible square to paint exactly that square.
5. Select another palette color and click the same square to recolor it.
6. Use animated rotation controls to expose the next three faces.
7. Paint all six faces.
8. Submit the state for validation.
9. If invalid, display concise guidance for the detected problem and remain in editing mode.
10. If valid, calculate a solution without exposing a user cancellation control.
11. Display the complete move sequence.
12. Advance one move at a time.
13. Animate the affected face or layer with direction arrows.
14. Update the digital cube after each completed animation.
15. Adjust animation speed as desired.
16. After completion, use `New Cube` to begin a new session.

## 4. Functional requirements

### FR-001: Cube-size selection

The application shall allow selection of supported cube sizes. The first complete implementation shall enable 3×3×3; later milestones shall enable larger sizes incrementally. 2×2×2 shall not be offered.

### FR-002: Fixed palette

The application shall display six predefined colors. The palette colors shall be fixed by the product configuration rather than user-configurable.

### FR-003: Single-facelet painting

The user shall select a palette color and click one visible square. Only that square shall change color. Drag painting is not required.

### FR-004: Recoloring

Any previously painted square shall be recolorable by selecting a different palette color and clicking that square again.

### FR-005: Unassigned-state tracking

The internal model shall distinguish an unassigned facelet from an intentionally white facelet. Unassigned facelets shall appear white with a visible marker.

### FR-006: Three-face view

Exactly three faces shall be visible at once. Rotation controls shall rotate the cube model, not the camera, and shall animate the transition to the corresponding next three faces.

### FR-007: Editing-state separation

Editing rotations shall change only display orientation. They shall not change the logical puzzle state.

### FR-008: Complete-face access

The user shall be able to rotate through the model and paint all six faces.

### FR-009: State validation

Before solving, the application shall validate completeness, color counts, center arrangement, piece identity, piece orientation, and permutation constraints appropriate to the supported cube size.

### FR-010: Invalid-state feedback

An invalid state shall prevent solving and display concise guidance for the detected issue.

### FR-011: Solution correctness

The application shall calculate a solution only for a valid state. The returned move sequence shall be replayed against a cloned state and verified to produce a solved cube before being shown to the user.

### FR-012: Non-cancellable solve workflow

Once a valid state has been submitted and solving begins, the UI shall not expose a user cancellation control. Internal failures must still be handled safely.

### FR-013: Move notation

The initial 3×3 release shall display standard face-turn notation such as `R`, `R'`, and `R2`. Wide and inner-layer notation shall be added for larger cubes.

### FR-014: Interactive playback

The user shall advance through the solution one move at a time. The application shall show the current move, remaining moves, affected face/layer, and direction.

### FR-015: Layer animation

Each playback move shall animate the corresponding logical layer. The logical move shall be committed only after the animation completes.

### FR-016: Playback speed

The user shall be able to adjust animation speed without changing the move sequence.

### FR-017: Completion reset

After the solution flow completes, `New Cube` shall clear the in-memory session and return to cube-size selection.

### FR-018: No incomplete persistence

Incomplete entries and playback progress shall not be saved to local storage, IndexedDB, a server, or a database.

### FR-019: Offline runtime

The built application shall not require runtime network requests, camera permissions, or a backend service.

### FR-020: Incremental size support

The domain, renderer, validator, notation, and solver interfaces shall allow additional cube sizes without rewriting the UI workflow.

## 5. Nonfunctional requirements

### NFR-001: Correctness

The application must not present an unverified solution. Domain move application, face orientation mapping, and solver conversion require automated tests.

### NFR-002: Responsiveness

Solving shall execute in a Web Worker so the main browser thread can continue rendering status and controls.

### NFR-003: Maintainability

The cube domain shall be framework-independent. Rendering, UI, and solver implementations shall communicate through typed interfaces.

### NFR-004: Testability

Every domain operation must be unit-testable without a browser. Critical end-to-end flows must be covered in a real browser.

### NFR-005: Portability

The application shall target modern browsers with WebGL 2 support, initially testing Chromium, Firefox, and WebKit through browser automation.

### NFR-006: Security

The application shall not contain secrets, make untrusted runtime code loads, or send cube data to external services.

### NFR-007: Performance scalability

3×3 must be smooth on an ordinary modern computer. Larger-cube rendering and solving performance shall be measured and optimized progressively rather than assumed.

### NFR-008: User clarity

The UI shall visibly distinguish the selected color, current move, affected layer, playback position, and solving status.

## 6. Constraints and assumptions

- The initial product supports any whole-cube orientation of its fixed color scheme; arbitrary color schemes remain out of scope.
- Users manually enter the physical cube state.
- The application cannot verify physical moves without a camera.
- The 3D display orientation and puzzle state are separate.
- Correctness is more important than shortest solution length.
- Open-source dependencies may be used after license and maintenance review.

## 7. MVP acceptance criteria

The 3×3 MVP is acceptable when a user can:

1. Start a new 3×3 session.
2. Paint and recolor every facelet through the 3D view.
3. Rotate the model through all six faces with animation.
4. Receive relevant invalid-state guidance for an invalid configuration.
5. Submit a valid scrambled state.
6. Receive a verified solution.
7. Advance through every move individually.
8. See each layer animate and the model update correctly.
9. Adjust animation speed.
10. Reach a solved digital cube and create a new cube.

