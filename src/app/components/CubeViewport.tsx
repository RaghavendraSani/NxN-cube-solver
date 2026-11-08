import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CubeRenderer } from '../../rendering/CubeRenderer';
import type { FaceletAddress } from '../../domain/cube/coordinates';
import type { CubeState } from '../../domain/cube/types';
import type { Move } from '../../domain/cube/moves';
import type { Face } from '../../domain/cube/faces';

export type CubeViewportHandle = {
  animateMove: (
    move: Move,
    duration: number,
    nextState: CubeState,
    onComplete: () => void,
  ) => boolean;
};
type Props = {
  state: CubeState;
  onSelect: (address: FaceletAddress) => void;
  disabled?: boolean;
  ref?: React.Ref<CubeViewportHandle>;
  highlight?: Face | null;
  onRotationChange?: (rotating: boolean) => void;
};

export function CubeViewport({
  state,
  onSelect,
  disabled = false,
  ref,
  highlight = null,
  onRotationChange,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const renderer = useRef<CubeRenderer | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = (address) => {
    if (!disabled) onSelect(address);
  };
  const [error, setError] = useState(false);
  const [rotating, setRotating] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      animateMove: (move, duration, nextState, onComplete) =>
        renderer.current?.animateMove(move, duration, nextState, onComplete) ?? false,
    }),
    [],
  );

  useEffect(() => {
    if (!container.current) return;
    try {
      renderer.current = new CubeRenderer(container.current, (address) =>
        onSelectRef.current(address),
      );
    } catch {
      setError(true);
      return;
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    renderer.current?.setState(state);
  }, [state]);
  useEffect(() => {
    renderer.current?.setHighlight(highlight);
  }, [highlight]);

  function rotate(axis: 'x' | 'y', direction: 1 | -1) {
    if (
      renderer.current?.rotate(axis, direction, () => {
        setRotating(false);
        onRotationChange?.(false);
      })
    ) {
      setRotating(true);
      onRotationChange?.(true);
    }
  }

  return (
    <>
      <div className="cube-viewport" ref={container} />
      {error && <p role="alert">3D rendering is unavailable in this browser.</p>}
      <div className="view-controls" aria-label="Rotate cube">
        <button
          type="button"
          disabled={rotating || error || disabled}
          onClick={() => rotate('y', -1)}
        >
          Rotate left
        </button>
        <button
          type="button"
          disabled={rotating || error || disabled}
          onClick={() => rotate('x', 1)}
        >
          Rotate up
        </button>
        <button
          type="button"
          disabled={rotating || error || disabled}
          onClick={() => rotate('x', -1)}
        >
          Rotate down
        </button>
        <button
          type="button"
          disabled={rotating || error || disabled}
          onClick={() => rotate('y', 1)}
        >
          Rotate right
        </button>
      </div>
    </>
  );
}
