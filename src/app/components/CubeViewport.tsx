import { useEffect, useRef, useState } from 'react';
import { CubeRenderer } from '../../rendering/CubeRenderer';
import type { FaceletAddress } from '../../domain/cube/coordinates';

export function CubeViewport() {
  const container = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<FaceletAddress | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let renderer: CubeRenderer;
    try {
      renderer = new CubeRenderer(container.current, setSelected);
    } catch {
      setError(true);
      return;
    }
    return () => renderer.dispose();
  }, []);
  return (
    <>
      <div className="cube-viewport" ref={container} />
      {error ? (
        <p role="alert">3D rendering is unavailable in this browser.</p>
      ) : (
        <p role="status">
          {selected
            ? `Selected: ${selected.face}, row ${selected.row + 1}, column ${selected.column + 1}`
            : 'Click a square to inspect its position.'}
        </p>
      )}
    </>
  );
}
