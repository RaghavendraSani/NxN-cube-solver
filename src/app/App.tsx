import { useEffect, useMemo, useRef, useState } from 'react';
import { createUnassignedCube } from '../domain/cube/state';
import {
  countColors,
  paintFacelet,
  PALETTE_COLORS,
  type PaletteColor,
} from '../domain/cube/inputState';
import type { FaceletAddress } from '../domain/cube/coordinates';
import { CubeViewport, type CubeViewportHandle } from './components/CubeViewport';
import { validateCube } from '../domain/threeByThree/validate';
import { runFourSolverWorker, runNxNSolverWorker, runSolverWorker } from '../solver/workerClient';
import { createNxNCube, isNxNSolved, type LayerMove } from '../domain/nxn/cube';
import { check4Entry } from '../domain/fourByFour/validate';
import { formatMoveN } from '../domain/nxn/notation';
import { checkNxNEntry, type NxNEntryStatus } from '../domain/nxn/validate';
import { applyMovesFast } from '../domain/nxn/applyMoves';
import { createExampleCube } from '../domain/nxn/example';
import { ENABLED_SIZES } from './capabilities';
import type { Color } from '../domain/cube/colors';
import type { Move } from '../domain/cube/moves';
import type { CubeState } from '../domain/cube/types';

const FACE_NAMES = { U: 'top', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' } as const;

/** Return the existing 3×3 validation guidance, or null for a valid cube. */
function validateThreeByThree(state: CubeState): string | null {
  const result = validateCube(state);
  if (result.valid) return null;
  const messages: Record<typeof result.reason, string> = {
    incomplete: 'Some squares have not been assigned. Click every dotted square.',
    'color-count': 'Each color must appear exactly nine times.',
    centers: 'The center colors do not match the supported cube color scheme.',
    'corner-piece':
      'A corner has an invalid or duplicated color combination. Check the entered squares.',
    'edge-piece':
      'An edge has an invalid or duplicated color combination. Check the entered squares.',
    'corner-orientation': 'The corner orientations are impossible. Check the entered squares.',
    'edge-orientation': 'The edge orientations are impossible. Check the entered squares.',
    parity: 'The piece arrangement is impossible. Check the entered squares.',
  };
  return messages[result.reason];
}

/** Return the existing 4×4 guidance when preliminary entry checks fail. */
function validateFourByFour(status: ReturnType<typeof check4Entry>['status']): string | null {
  return status === 'counts-ok'
    ? null
    : 'The 4×4 entry has missing or invalid pieces. Check the message above.';
}

/** Explain why an entry of 5×5 or larger cannot be sent to the solver. */
function validateLargeCube(status: NxNEntryStatus, size: number): string | null {
  const messages: Record<NxNEntryStatus, string | null> = {
    incomplete: 'Assign every square before solving.',
    'color-count': `Each color must appear exactly ${size * size} times.`,
    'center-count': 'Each group of matching center squares must contain every color equally.',
    'center-scheme': 'The fixed center colors do not match the supported color scheme.',
    'corner-piece': 'A corner has an invalid or duplicated color combination.',
    'corner-orientation': 'The corner orientations are impossible.',
    'wing-piece': 'An edge piece has an invalid or duplicated color combination.',
    'edge-orientation': 'The edge orientations are impossible.',
    parity: 'The piece arrangement is impossible.',
    'counts-ok': null,
  };
  return messages[status];
}

/** Coordinate cube entry, worker solving, and one-move-at-a-time playback. */
export function App() {
  // Puzzle state and display animation state remain separate throughout the session.
  const [cube, setCube] = useState(createUnassignedCube);
  const [size, setSize] = useState(3);
  const [selectedColor, setSelectedColor] = useState<PaletteColor>('red');
  const [phase, setPhase] = useState<'editing' | 'invalid' | 'solving' | 'solved' | 'error'>(
    'editing',
  );
  const [solution, setSolution] = useState<LayerMove[]>([]);
  const [reference, setReference] = useState<{ U: readonly Color[]; F: readonly Color[] } | null>(
    null,
  );
  const [validationMessage, setValidationMessage] = useState('');
  const [session, setSession] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [viewRotating, setViewRotating] = useState(false);
  const [duration, setDuration] = useState(600);
  const [playbackError, setPlaybackError] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [jumpTarget, setJumpTarget] = useState('');
  const viewportRef = useRef<CubeViewportHandle>(null);
  const animatingRef = useRef(false);
  const workerRef = useRef<{ dispose: () => boolean } | null>(null);
  // Stop the active worker if the component is removed.
  useEffect(
    () => () => {
      workerRef.current?.dispose();
      workerRef.current = null;
    },
    [],
  );
  const counts = countColors(cube);
  const fourEntryCheck = size === 4 ? check4Entry(cube).status : null;
  const largeEntryCheck = useMemo(
    () => (size >= 5 ? checkNxNEntry(cube, size) : null),
    [cube, size],
  );
  /** Paint one selected facelet while editing is available. */
  function paint(address: FaceletAddress) {
    if (workerRef.current || phase === 'solved') return;
    setCube((current) => paintFacelet(current, address, selectedColor, size));
    setPhase('editing');
  }
  /** Validate the entry and request a verified solution from the worker. */
  function startSolve() {
    if (workerRef.current || phase === 'solved' || viewRotating) return;
    const message =
      size === 3
        ? validateThreeByThree(cube)
        : size === 4
          ? validateFourByFour(fourEntryCheck!)
          : validateLargeCube(largeEntryCheck!, size);
    if (message) {
      setValidationMessage(message);
      setPhase('invalid');
      return;
    }
    try {
      const createWorker = () =>
        new Worker(new URL('../workers/solver.worker.ts', import.meta.url), { type: 'module' });
      let request: ReturnType<typeof runSolverWorker> | ReturnType<typeof runNxNSolverWorker>;
      if (size === 3) {
        request = runSolverWorker(cube, createWorker);
      } else if (size === 4) {
        request = runFourSolverWorker(cube, createWorker);
        setReference({ U: [...cube.U], F: [...cube.F] });
      } else {
        request = runNxNSolverWorker(cube, size, createWorker);
        setReference({ U: [...cube.U], F: [...cube.F] });
      }
      workerRef.current = request;
      setPhase('solving');
      request.promise
        .then((response) => {
          if (workerRef.current !== request) return;
          workerRef.current = null;
          if (response.ok) {
            setSolution(
              (response.moves as (Move | LayerMove)[]).map((move) =>
                'layer' in move ? move : { ...move, layer: 0, width: 1 },
              ),
            );
            setPhase('solved');
          } else setPhase('error');
        })
        .catch(() => {
          if (workerRef.current !== request) return;
          workerRef.current = null;
          setPhase('error');
        });
    } catch {
      workerRef.current?.dispose();
      workerRef.current = null;
      setPhase('error');
    }
  }
  /** Reset the entire in-memory session for a new entry. */
  function newCube() {
    setCube(createUnassignedCube());
    setSize(3);
    setSelectedColor('red');
    setSolution([]);
    setReference(null);
    setMoveIndex(0);
    setPlaybackError(false);
    setAutoPlay(false);
    setJumpTarget('');
    setDuration(600);
    setSession((current) => current + 1);
    setPhase('editing');
  }
  /** Animate one move, then commit its resulting logical state. */
  function nextMove() {
    if (animatingRef.current || viewRotating || phase !== 'solved' || moveIndex >= solution.length)
      return;
    const move = solution[moveIndex];
    const next = applyMovesFast(cube, size, [move]);
    animatingRef.current = true;
    const started = viewportRef.current?.animateMove(move, duration, next, () => {
      setCube(next);
      setMoveIndex(moveIndex + 1);
      if (moveIndex + 1 === solution.length && !isNxNSolved(next, size)) setPlaybackError(true);
      animatingRef.current = false;
      setAnimating(false);
    });
    if (started) setAnimating(true);
    else animatingRef.current = false;
  }
  /** Apply several moves at once without animation, for navigating long solutions. */
  function skipTo(requested: number) {
    if (animatingRef.current || viewRotating || phase !== 'solved') return;
    const target = Math.min(Math.max(Math.trunc(requested), moveIndex), solution.length);
    if (target === moveIndex) return;
    setAutoPlay(false);
    const next = applyMovesFast(cube, size, solution.slice(moveIndex, target));
    setCube(next);
    setMoveIndex(target);
    if (target === solution.length && !isNxNSolved(next, size)) setPlaybackError(true);
  }
  // Auto-play still advances one animated move at a time; it only presses "Next move" for you.
  useEffect(() => {
    if (!autoPlay) return;
    if (phase !== 'solved' || moveIndex >= solution.length) {
      setAutoPlay(false);
      return;
    }
    if (!animating && !viewRotating) nextMove();
  }, [autoPlay, animating, viewRotating, moveIndex, phase]);
  const currentMove = phase === 'solved' ? solution[moveIndex] : undefined;
  const complete = phase === 'solved' && moveIndex === solution.length && isNxNSolved(cube, size);
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="app-title">
        <h1 id="app-title">CubeSolver</h1>
        <label>
          Cube size{' '}
          <select
            aria-label="Cube size"
            value={size}
            disabled={phase === 'solving' || phase === 'solved' || viewRotating}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSize(next);
              setCube(createNxNCube(next));
              setSession((current) => current + 1);
              setPhase('editing');
            }}
          >
            {ENABLED_SIZES.map((option) => (
              <option key={option} value={option}>
                {option}×{option}
              </option>
            ))}
          </select>
        </label>
        {size !== 3 && <p>Changing size clears the current entry.</p>}
        <p className="welcome-copy">
          Choose a color, then click a square. Rotate the cube to reach each face.
        </p>
        <p>
          Match the cube in any orientation. Dots mark squares that still need a color. Supported
          opposites are white/yellow, green/blue, and red/orange.
        </p>
        <div className="palette" aria-label="Color palette">
          {PALETTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-button color-${color}`}
              aria-pressed={selectedColor === color}
              disabled={phase === 'solving' || phase === 'solved'}
              onClick={() => setSelectedColor(color)}
            >
              {color} ({counts[color]}/{size * size})
            </button>
          ))}
        </div>
        <p>
          <button
            type="button"
            disabled={phase === 'solving' || phase === 'solved'}
            onClick={() => {
              setCube(createExampleCube(size));
              setPhase('editing');
            }}
          >
            Load example
          </button>{' '}
          Fills in a legal scrambled cube of this size so you can try the solver without a physical
          cube.
        </p>
        <CubeViewport
          key={session}
          ref={viewportRef}
          state={cube}
          onSelect={paint}
          disabled={phase === 'solving' || animating}
          highlight={currentMove ?? null}
          onRotationChange={setViewRotating}
          size={size}
        />
        <p role="status">{counts.unassigned} squares remaining to assign.</p>
        {fourEntryCheck === 'color-count' && <p>Each color must appear exactly 16 times.</p>}
        {fourEntryCheck === 'corner-piece' && (
          <p>Corner color combinations are invalid or duplicated.</p>
        )}
        {fourEntryCheck === 'corner-orientation' && <p>Corner orientations are impossible.</p>}
        {fourEntryCheck === 'wing-piece' && (
          <p>Edge piece color combinations are invalid or duplicated.</p>
        )}
        {fourEntryCheck === 'counts-ok' && (
          <p>
            Color counts and piece combinations pass preliminary checks. Physical solvability has
            not been checked.
          </p>
        )}
        {largeEntryCheck && largeEntryCheck !== 'incomplete' && largeEntryCheck !== 'counts-ok' && (
          <p>{validateLargeCube(largeEntryCheck, size)}</p>
        )}
        {largeEntryCheck === 'counts-ok' && (
          <p>
            The entry passes every reachability check. The solver still verifies each move sequence
            before showing it.
          </p>
        )}
        {phase !== 'solved' && (
          <button type="button" disabled={phase === 'solving' || viewRotating} onClick={startSolve}>
            Solve
          </button>
        )}
        {phase === 'invalid' && <p role="alert">{validationMessage}</p>}
        {phase === 'solving' && <p role="status">Calculating solution…</p>}
        {phase === 'error' && (
          <p role="alert">Unable to calculate a verified solution. Please try again.</p>
        )}
        {phase === 'solved' && (
          <section aria-label="Verified solution">
            <h2>Verified solution</h2>
            {size === 3 ? (
              <p>
                Hold your physical cube with {cube.U[4]} on top (U), {cube.F[4]} in front (F), and{' '}
                {cube.R[4]} on the right (R). Keep this orientation while following the moves.
              </p>
            ) : (
              reference && (
                <div>
                  <p>
                    Match the physical cube to the original top (U) and front (F) patterns below.
                    Read each row while looking directly at that face. Keep that orientation while
                    following moves; rotating the on-screen view does not change the move names.
                  </p>
                  {(['U', 'F'] as const).map((face) => (
                    <div key={face}>
                      <strong>{face === 'U' ? 'Original top (U)' : 'Original front (F)'}</strong>
                      {Array.from({ length: size }, (_, row) => (
                        <div key={row}>
                          {reference[face].slice(row * size, row * size + size).join(' · ')}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            )}
            {solution.length > 0 && (
              <progress
                aria-label="Solution progress"
                max={solution.length}
                value={moveIndex}
                style={{ width: '100%' }}
              />
            )}
            {solution.length > 0 && (
              <p aria-label="Move sequence">
                {solution.map((move, index) => (
                  <span
                    key={index}
                    className={index === moveIndex ? 'current-move' : undefined}
                    aria-current={index === moveIndex ? 'step' : undefined}
                  >
                    {formatMoveN(move)}{' '}
                  </span>
                ))}
              </p>
            )}
            {currentMove && (
              <>
                <p>
                  Move {moveIndex + 1} of {solution.length}:{' '}
                  <strong>{formatMoveN(currentMove)}</strong>
                </p>
                <p>
                  <span aria-hidden="true">{currentMove.turns === -1 ? '↶' : '↷'}</span> Turn the{' '}
                  {currentMove.width > 1
                    ? `outer ${currentMove.width} layers of the`
                    : currentMove.layer > 0
                      ? `layer ${currentMove.layer + 1} from the`
                      : 'outer layer of the'}{' '}
                  {FACE_NAMES[currentMove.face]} face ({currentMove.face}){' '}
                  {currentMove.turns === 2
                    ? '180 degrees'
                    : currentMove.turns === -1
                      ? 'counterclockwise'
                      : 'clockwise'}
                  , as viewed directly facing that face.
                </p>
                <p>
                  The yellow highlight marks the moving layer. Rotate the view if the face is
                  hidden.
                </p>
                <label>
                  Animation speed{' '}
                  <select
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    disabled={animating}
                  >
                    <option value={1200}>Slow</option>
                    <option value={600}>Normal</option>
                    <option value={250}>Fast</option>
                    <option value={80}>Very fast</option>
                  </select>
                </label>{' '}
                <button
                  type="button"
                  onClick={nextMove}
                  disabled={animating || viewRotating || autoPlay}
                >
                  Next move
                </button>{' '}
                <button
                  type="button"
                  aria-pressed={autoPlay}
                  onClick={() => setAutoPlay((current) => !current)}
                  disabled={viewRotating}
                >
                  {autoPlay ? 'Pause' : 'Auto-play'}
                </button>
                {solution.length > 30 && (
                  <p>
                    Long solution: skip ahead without animation, or jump to a move number.{' '}
                    <button
                      type="button"
                      disabled={animating || viewRotating}
                      onClick={() => skipTo(moveIndex + 10)}
                    >
                      Skip 10
                    </button>{' '}
                    <button
                      type="button"
                      disabled={animating || viewRotating}
                      onClick={() => skipTo(moveIndex + 100)}
                    >
                      Skip 100
                    </button>{' '}
                    <label>
                      Go to move{' '}
                      <input
                        type="number"
                        min={moveIndex}
                        max={solution.length}
                        value={jumpTarget}
                        onChange={(event) => setJumpTarget(event.target.value)}
                      />
                    </label>{' '}
                    <button
                      type="button"
                      disabled={animating || viewRotating || jumpTarget === ''}
                      onClick={() => skipTo(Number(jumpTarget) - 1)}
                    >
                      Go
                    </button>
                  </p>
                )}
              </>
            )}
            {complete && (
              <p role="status">
                {solution.length === 0 ? 'The cube is already solved.' : 'Cube solved!'}
              </p>
            )}
            {playbackError && (
              <p role="alert">Playback did not reach a solved state. Start a new cube.</p>
            )}
            {(complete || playbackError) && (
              <button type="button" onClick={newCube}>
                New Cube
              </button>
            )}
          </section>
        )}
        <p>
          <a href="./THIRD_PARTY_NOTICES.txt">Third-party software notices</a>
        </p>
      </section>
    </main>
  );
}
