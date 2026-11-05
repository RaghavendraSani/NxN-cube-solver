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
import type { SolveResponse } from '../solver/protocol';

export function App() {
  const [cube, setCube] = useState(createUnassignedCube);
  const [selectedColor, setSelectedColor] = useState<PaletteColor>('red');
  const [phase, setPhase] = useState<'editing' | 'invalid' | 'solving' | 'solved' | 'error'>(
    'editing',
  );
  const [solution, setSolution] = useState<Move[]>([]);
  const [session, setSession] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
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
    if (!validateCube(cube).valid) {
      setPhase('invalid');
      return;
    }
    try {
      const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;
      setPhase('solving');
      const finish = () => {
        worker.terminate();
        workerRef.current = null;
      };
      worker.onmessage = (event: MessageEvent<SolveResponse>) => {
        finish();
        if (event.data.ok) {
          setSolution(event.data.moves);
          setPhase('solved');
        } else setPhase('error');
      };
      worker.onerror = () => {
        finish();
        setPhase('error');
      };
      worker.onmessageerror = () => {
        finish();
        setPhase('error');
      };
      worker.postMessage({ state: cube });
    } catch {
      workerRef.current?.terminate();
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
        <p>Start with white on top, green in front, and red on the right.</p>
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
          state={cube}
          onSelect={paint}
          disabled={phase === 'solving' || phase === 'solved'}
        />
        <p role="status">{counts.unassigned} squares remaining to assign.</p>
        {phase !== 'solved' && (
          <button type="button" disabled={phase === 'solving'} onClick={startSolve}>
            Solve
          </button>
        )}
        {phase === 'invalid' && <p role="alert">Invalid state. Try again.</p>}
        {phase === 'solving' && <p role="status">Calculating solution…</p>}
        {phase === 'error' && (
          <p role="alert">Unable to calculate a verified solution. Please try again.</p>
        )}
        {phase === 'solved' && (
          <section aria-label="Verified solution">
            <h2>Verified solution</h2>
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
