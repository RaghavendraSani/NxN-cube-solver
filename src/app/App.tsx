import { useState } from 'react';
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

export function App() {
  const [cube, setCube] = useState(createUnassignedCube);
  const [selectedColor, setSelectedColor] = useState<PaletteColor>('red');
  const [validation, setValidation] = useState<'valid' | 'invalid' | null>(null);
  const counts = countColors(cube);
  function paint(address: FaceletAddress) {
    setCube((current) => paintFacelet(current, address, selectedColor));
    setValidation(null);
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
              onClick={() => setSelectedColor(color)}
            >
              {color} ({counts[color]}/9)
            </button>
          ))}
        </div>
        <CubeViewport state={cube} onSelect={paint} />
        <p role="status">{counts.unassigned} squares remaining to assign.</p>
        <button
          type="button"
          onClick={() => setValidation(validateCube(cube).valid ? 'valid' : 'invalid')}
        >
          Solve
        </button>
        {validation === 'invalid' && <p role="alert">Invalid state. Try again.</p>}
        {validation === 'valid' && (
          <p role="status">
            Valid cube. Solution calculation will be available in the next milestone.
          </p>
        )}
      </section>
    </main>
  );
}
