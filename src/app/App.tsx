import { useEffect, useRef, useState } from 'react';
import { createUnassignedCube } from '../domain/cube/state';
import {
  countColors,
  paintFacelet,
  PALETTE_COLORS,
  type PaletteColor,
} from '../domain/cube/inputState';
import type { FaceletAddress } from '../domain/cube/coordinates';
import { CubeViewport, type CubeViewportHandle } from './components/CubeViewport';
import { validateCube } from '../domain/validation/validateCube';
import type { Move } from '../domain/cube/moves';
import { runSolverWorker } from '../solver/workerClient';
import { applyMove } from '../domain/cube/applyMove';
import { isSolved } from '../domain/cube/isSolved';

const FACE_NAMES = { U: 'top', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' } as const;
const notation = ({ face, turns }: Move) => `${face}${turns === -1 ? "'" : turns === 2 ? '2' : ''}`;

export function App() {
  const [cube, setCube] = useState(createUnassignedCube);
  const [selectedColor, setSelectedColor] = useState<PaletteColor>('red');
  const [phase, setPhase] = useState<'editing' | 'invalid' | 'solving' | 'solved' | 'error'>(
    'editing',
  );
  const [solution, setSolution] = useState<Move[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [session, setSession] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [viewRotating, setViewRotating] = useState(false);
  const [duration, setDuration] = useState(600);
  const [playbackError, setPlaybackError] = useState(false);
  const viewportRef = useRef<CubeViewportHandle>(null);
  const animatingRef = useRef(false);
  const workerRef = useRef<ReturnType<typeof runSolverWorker> | null>(null);
  useEffect(
    () => () => {
      workerRef.current?.dispose();
      workerRef.current = null;
    },
    [],
  );
  const counts = countColors(cube);
  function paint(address: FaceletAddress) {
    if (workerRef.current || phase === 'solved') return;
    setCube((current) => paintFacelet(current, address, selectedColor));
    setPhase('editing');
  }
  function startSolve() {
    if (workerRef.current || phase === 'solved') return;
    const result = validateCube(cube);
    if (!result.valid) {
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
      setValidationMessage(messages[result.reason]);
      setPhase('invalid');
      return;
    }
    try {
      const request = runSolverWorker(
        cube,
        () =>
          new Worker(new URL('../workers/solver.worker.ts', import.meta.url), { type: 'module' }),
      );
      workerRef.current = request;
      setPhase('solving');
      request.promise
        .then((response) => {
          if (workerRef.current !== request) return;
          workerRef.current = null;
          if (response.ok) {
            setSolution(response.moves);
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
  function newCube() {
    setCube(createUnassignedCube());
    setSelectedColor('red');
    setSolution([]);
    setMoveIndex(0);
    setPlaybackError(false);
    setDuration(600);
    setSession((current) => current + 1);
    setPhase('editing');
  }
  function nextMove() {
    if (animatingRef.current || viewRotating || phase !== 'solved' || moveIndex >= solution.length)
      return;
    const move = solution[moveIndex];
    const next = applyMove(cube, move);
    animatingRef.current = true;
    const started = viewportRef.current?.animateMove(move, duration, next, () => {
      setCube(next);
      setMoveIndex(moveIndex + 1);
      if (moveIndex + 1 === solution.length && !isSolved(next)) setPlaybackError(true);
      animatingRef.current = false;
      setAnimating(false);
    });
    if (started) setAnimating(true);
    else animatingRef.current = false;
  }
  const currentMove = phase === 'solved' ? solution[moveIndex] : undefined;
  const complete = phase === 'solved' && moveIndex === solution.length && isSolved(cube);
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="app-title">
        <h1 id="app-title">CubeSolver</h1>
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
              {color} ({counts[color]}/9)
            </button>
          ))}
        </div>
        <CubeViewport
          key={session}
          ref={viewportRef}
          state={cube}
          onSelect={paint}
          disabled={phase === 'solving' || animating}
          highlight={currentMove?.face ?? null}
          onRotationChange={setViewRotating}
        />
        <p role="status">{counts.unassigned} squares remaining to assign.</p>
        {phase !== 'solved' && (
          <button type="button" disabled={phase === 'solving'} onClick={startSolve}>
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
            <p>
              Hold your physical cube with {cube.U[4]} on top (U), {cube.F[4]} in front (F), and{' '}
              {cube.R[4]} on the right (R). Keep this orientation while following the moves.
            </p>
            {solution.length > 0 && (
              <p aria-label="Move sequence">
                {solution.map((move, index) => (
                  <span
                    key={index}
                    className={index === moveIndex ? 'current-move' : undefined}
                    aria-current={index === moveIndex ? 'step' : undefined}
                  >
                    {notation(move)}{' '}
                  </span>
                ))}
              </p>
            )}
            {currentMove && (
              <>
                <p>
                  Move {moveIndex + 1} of {solution.length}:{' '}
                  <strong>{notation(currentMove)}</strong>
                </p>
                <p>
                  <span aria-hidden="true">{currentMove.turns === -1 ? '↶' : '↷'}</span> Turn the{' '}
                  {FACE_NAMES[currentMove.face]} face ({cube[currentMove.face][4]} center){' '}
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
                  </select>
                </label>{' '}
                <button type="button" onClick={nextMove} disabled={animating || viewRotating}>
                  Next move
                </button>
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
      </section>
    </main>
  );
}
