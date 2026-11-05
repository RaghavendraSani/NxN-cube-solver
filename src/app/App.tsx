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

export function App() {
  const [cube, setCube] = useState(createUnassignedCube);
  const [selectedColor, setSelectedColor] = useState<PaletteColor>('red');
  const counts = countColors(cube);
  function paint(address: FaceletAddress) {
    setCube((current) => paintFacelet(current, address, selectedColor));
  }
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="app-title">
        <h1 id="app-title">CubeSolver</h1>
        <p className="welcome-copy">
          Choose a color, then click a square. Rotate the cube to reach each face.
        </p>
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
      </section>
    </main>
  );
}
