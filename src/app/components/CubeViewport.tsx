import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CubeRenderer } from '../../rendering/CubeRenderer';
import type { FaceletAddress } from '../../domain/cube/coordinates';
import type { CubeState } from '../../domain/cube/types';
import type { Move } from '../../domain/cube/moves';
import type { LayerMove } from '../../domain/nxn/cube';

export type CubeViewportHandle = {
  animateMove: (
    move: Move | LayerMove,
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
  highlight?: LayerMove | null;
  onRotationChange?: (rotating: boolean) => void;
  size?: number;
};

export function CubeViewport({
  state,
  onSelect,
  disabled = false,
  ref,
  highlight = null,
  onRotationChange,
  size = 3,
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
      renderer.current = new CubeRenderer(
        container.current,
        (address) => onSelectRef.current(address),
        size,
      );
    } catch {
      setError(true);
      return;
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [size]);
  useEffect(() => {
    renderer.current?.setState(state);
  }, [state]);
  useEffect(() => {
    renderer.current?.setHighlight(highlight?.face ?? null, highlight?.layer, highlight?.width);
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
