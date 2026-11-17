import {
  BoxGeometry,
  CircleGeometry,
  Color as ThreeColor,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  type Raycaster,
  Vector3,
} from 'three';
import { FACE_BASIS, type FaceletAddress } from '../domain/cube/coordinates';
import { FACES } from '../domain/cube/faces';
import type { CubeState } from '../domain/cube/types';
import type { Color } from '../domain/cube/colors';
import type { Move } from '../domain/cube/moves';
import type { Face } from '../domain/cube/faces';
import { toNxNCoordinates, type LayerMove } from '../domain/nxn/cube';

const COLOR_VALUES: Record<Color, number> = {
  red: 0xd22630,
  blue: 0x3777db,
  yellow: 0xffdc00,
  green: 0x27bd2c,
  white: 0xffffff,
  orange: 0xff7900,
  unassigned: 0xffffff,
};

/**
 * Build the cube as four instanced meshes (bodies, stickers, unassigned markers and layer
 * highlights), so the number of draw calls does not grow with the cube size. Only cubies on
 * the surface are drawn; one dark core fills the interior. Sticker `i` is the facelet at
 * `faceIndex * size² + row * size + column`, the same order as the solver's engine.
 */
export function createCubeScene(size = 3) {
  const group = new Group();
  const step = 3 / size;
  const faceSize = size * size;
  const total = 6 * faceSize;
  const edge = size - 1;

  // Sticker geometry: base transforms and doubled integer coordinates per facelet.
  const addresses: FaceletAddress[] = [];
  const stickerBase: Matrix4[] = [];
  const markerBase: Matrix4[] = [];
  const highlightBase: Matrix4[] = [];
  const positions: [number, number, number][] = [];
  const up = new Vector3(0, 0, 1);
  const one = new Vector3(1, 1, 1);
  FACES.forEach((face) => {
    for (let row = 0; row < size; row++)
      for (let column = 0; column < size; column++) {
        const address: FaceletAddress = { face, row, column };
        const { position, normal } = toNxNCoordinates(address, size);
        const outward = new Vector3(...normal);
        const translation = new Vector3(...position)
          .multiplyScalar(step / 2)
          .addScaledVector(outward, 0.51 * step);
        const rotation = new Quaternion().setFromUnitVectors(up, outward);
        const matrix = new Matrix4().compose(translation, rotation, one);
        addresses.push(address);
        positions.push([position[0], position[1], position[2]]);
        stickerBase.push(matrix);
        markerBase.push(matrix.clone().multiply(new Matrix4().makeTranslation(0, 0, 0.002)));
        highlightBase.push(matrix.clone().multiply(new Matrix4().makeTranslation(0, 0, 0.003)));
      }
  });

  // Surface cubies only; the interior is covered by a single core block.
  const cubieBase: Matrix4[] = [];
  const cubieCoordinates: [number, number, number][] = [];
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++)
      for (let z = 0; z < size; z++) {
        if (![x, y, z].some((c) => c === 0 || c === edge)) continue;
        cubieBase.push(
          new Matrix4().makeTranslation(
            (x - edge / 2) * step,
            (y - edge / 2) * step,
            (z - edge / 2) * step,
          ),
        );
        // Doubled coordinates, matching sticker positions.
        cubieCoordinates.push([2 * x - edge, 2 * y - edge, 2 * z - edge]);
      }

  const bodyGeometry = new BoxGeometry(0.98 * step, 0.98 * step, 0.98 * step);
  const bodyMaterial = new MeshBasicMaterial({ color: 0x151515 });
  const bodies = new InstancedMesh(bodyGeometry, bodyMaterial, cubieBase.length);
  bodies.instanceMatrix.setUsage(DynamicDrawUsage);
  cubieBase.forEach((matrix, i) => bodies.setMatrixAt(i, matrix));
  const coreSide = Math.max(size - 2, 1) * step;
  const coreGeometry = new BoxGeometry(coreSide, coreSide, coreSide);
  const core = new Mesh(coreGeometry, bodyMaterial);

  const stickerGeometry = new PlaneGeometry(0.9 * step, 0.9 * step);
  const stickerMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const stickers = new InstancedMesh(stickerGeometry, stickerMaterial, total);
  stickers.instanceMatrix.setUsage(DynamicDrawUsage);
  const markerGeometry = new CircleGeometry(0.06 * step, 16);
  const markerMaterial = new MeshBasicMaterial({ color: 0x777777 });
  const markers = new InstancedMesh(markerGeometry, markerMaterial, total);
  markers.instanceMatrix.setUsage(DynamicDrawUsage);
  // Markers are not pickable; clicks always resolve to the sticker beneath them.
  markers.raycast = () => {};
  const highlightGeometry = new PlaneGeometry(0.9 * step, 0.9 * step);
  const highlightMaterial = new MeshBasicMaterial({
    color: 0xffcf00,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const highlights = new InstancedMesh(highlightGeometry, highlightMaterial, total);
  highlights.instanceMatrix.setUsage(DynamicDrawUsage);
  highlights.raycast = () => {};

  const hidden = new Matrix4().makeScale(0, 0, 0);
  const marked = new Array<boolean>(total).fill(true);
  const lit = new Array<boolean>(total).fill(false);
  const colorObjects = Object.fromEntries(
    Object.entries(COLOR_VALUES).map(([key, hex]) => [key, new ThreeColor(hex)]),
  ) as Record<Color, ThreeColor>;
  for (let i = 0; i < total; i++) {
    stickers.setMatrixAt(i, stickerBase[i]);
    stickers.setColorAt(i, colorObjects.unassigned);
    markers.setMatrixAt(i, markerBase[i]);
    highlights.setMatrixAt(i, hidden);
  }
  group.add(core, bodies, stickers, markers, highlights);

  const flush = () => {
    for (const mesh of [bodies, stickers, markers, highlights])
      mesh.instanceMatrix.needsUpdate = true;
    if (stickers.instanceColor) stickers.instanceColor.needsUpdate = true;
  };
  const indexOfLayer = (index: number, axis: Vector3) => {
    const [x, y, z] = positions[index];
    return (edge - (x * axis.x + y * axis.y + z * axis.z)) / 2;
  };
  const indexOf = (address: FaceletAddress) =>
    FACES.indexOf(address.face) * faceSize + address.row * size + address.column;
  const paintInstance = (i: number, rotation?: Matrix4) => {
    const apply = (mesh: InstancedMesh, matrix: Matrix4, visible: boolean) =>
      mesh.setMatrixAt(
        i,
        visible ? (rotation ? rotation.clone().multiply(matrix) : matrix) : hidden,
      );
    apply(stickers, stickerBase[i], true);
    apply(markers, markerBase[i], marked[i]);
    apply(highlights, highlightBase[i], lit[i]);
  };

  return {
    group,
    addresses,
    /** Closest sticker hit by the ray, as its logical address. */
    pick(raycaster: Raycaster): FaceletAddress | null {
      const hit = raycaster.intersectObject(stickers, false)[0];
      return hit && hit.instanceId !== undefined ? addresses[hit.instanceId] : null;
    },
    /** Current transform of one sticker (used by tests and animation checks). */
    stickerMatrix(address: FaceletAddress): Matrix4 {
      const matrix = new Matrix4();
      stickers.getMatrixAt(indexOf(address), matrix);
      return matrix;
    },
    stickerColor(address: FaceletAddress): number {
      const color = new ThreeColor();
      stickers.getColorAt(indexOf(address), color);
      return color.getHex();
    },
    isMarked(address: FaceletAddress): boolean {
      return marked[indexOf(address)];
    },
    highlightedCount(): number {
      return lit.filter(Boolean).length;
    },
    drawCalls: 5,
    /** Show which stickers belong to the selected layer range. */
    setHighlight(face: Face | null, layer = 0, width = 1) {
      const axis = face === null ? null : new Vector3(...FACE_BASIS[face][0]);
      for (let i = 0; i < total; i++) {
        const index = axis === null ? -1 : indexOfLayer(i, axis);
        lit[i] = axis !== null && index >= layer && index < layer + width;
        highlights.setMatrixAt(i, lit[i] ? highlightBase[i] : hidden);
      }
      flush();
    },
    /** Temporarily rotate the selected instances so they turn together. */
    beginLayerTurn(move: Move | LayerMove) {
      const axis = new Vector3(...FACE_BASIS[move.face][0]);
      const layer = 'layer' in move ? move.layer : 0;
      const width = 'width' in move ? move.width : 1;
      if (
        !Number.isInteger(layer) ||
        !Number.isInteger(width) ||
        layer < 0 ||
        width < 1 ||
        layer + width > size
      )
        throw new RangeError('Invalid animation layer.');
      const movingStickers: number[] = [];
      for (let i = 0; i < total; i++) {
        const index = indexOfLayer(i, axis);
        if (index >= layer && index < layer + width) movingStickers.push(i);
      }
      const movingBodies: number[] = [];
      cubieCoordinates.forEach(([x, y, z], i) => {
        const index = (edge - (x * axis.x + y * axis.y + z * axis.z)) / 2;
        if (index >= layer && index < layer + width) movingBodies.push(i);
      });
      return {
        /** Rotate the selected instances to the requested animation progress. */
        setProgress(progress: number) {
          const rotation = new Matrix4().makeRotationAxis(
            axis,
            (-move.turns * Math.PI * progress) / 2,
          );
          for (const i of movingStickers) paintInstance(i, rotation);
          for (const i of movingBodies)
            bodies.setMatrixAt(i, rotation.clone().multiply(cubieBase[i]));
          flush();
        },
        /** Restore instance transforms; the caller then paints the next state. */
        finish() {
          for (const i of movingStickers) paintInstance(i);
          for (const i of movingBodies) bodies.setMatrixAt(i, cubieBase[i]);
          flush();
        },
      };
    },
    /** Update sticker colors and unassigned markers. */
    setState(state: CubeState) {
      for (let i = 0; i < total; i++) {
        const { face, row, column } = addresses[i];
        const color = state[face][row * size + column];
        stickers.setColorAt(i, colorObjects[color]);
        marked[i] = color === 'unassigned';
        markers.setMatrixAt(i, marked[i] ? markerBase[i] : hidden);
      }
      flush();
    },
    /** Dispose shared geometries, materials and instance buffers once. */
    dispose() {
      for (const mesh of [bodies, stickers, markers, highlights]) mesh.dispose();
      bodyGeometry.dispose();
      coreGeometry.dispose();
      bodyMaterial.dispose();
      stickerGeometry.dispose();
      stickerMaterial.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      highlightGeometry.dispose();
      highlightMaterial.dispose();
    },
  };
}
