import { useEffect, useRef, useState } from 'react';
import { createUnassignedCube } from '../domain/cube/state';
import {
  countColors,
  paintFacelet,
  PALETTE_COLORS,
  type PaletteColor,
} from '../domain/cube/inputState';
import type { FaceletAddress } from '../domain/cube/coordinates';
import { CubeViewport } from './components/CubeViewport';
import { validateCube } from '../domain/validation/validateCube';
import type { Move } from '../domain/cube/moves';
import { runSolverWorker } from '../solver/workerClient';

export function App() {
  const [cube, setCube] = useState(createUnassignedCube);
  const [selectedColor, setSelectedColor] = useState<PaletteColor>('red');
  const [phase, setPhase] = useState<'editing' | 'invalid' | 'solving' | 'solved' | 'error'>(
    'editing',
  );
  const [solution, setSolution] = useState<Move[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [session, setSession] = useState(0);
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
    setSession((current) => current + 1);
    setPhase('editing');
  }
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
        <CubeViewport key={session} state={cube} onSelect={paint} disabled={phase === 'solving'} />
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
            {solution.length === 0 ? (
              <p>The cube is already solved.</p>
            ) : (
              <p>
                {solution
                  .map(({ face, turns }) => `${face}${turns === -1 ? "'" : turns === 2 ? '2' : ''}`)
                  .join(' ')}
              </p>
            )}
            <button type="button" onClick={newCube}>
              New Cube
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
